from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7

# Create the main app
app = FastAPI(title="SAPT Fitness Booking API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    phone: Optional[str] = None
    age: Optional[int] = None
    fitness_goals: Optional[str] = None
    health_conditions: Optional[str] = None
    previous_injuries: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    initials: str
    picture: Optional[str] = None
    is_admin: bool = False
    credits: int = 0
    has_unlimited: bool = False
    profile_completed: bool = False
    profile: Optional[UserProfile] = None
    created_at: datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    phone: Optional[str] = None
    age: Optional[int] = None
    fitness_goals: Optional[str] = None
    health_conditions: Optional[str] = None
    previous_injuries: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

class CreditPurchase(BaseModel):
    package_type: str  # "single", "double", "unlimited"
    payment_method: str  # "cash", "transfer"

class BookingCreate(BaseModel):
    date: str  # YYYY-MM-DD format
    time_slot: str  # "morning" or "afternoon"
    is_recurring: bool = False  # For recurring bookings
    recurring_weeks: int = 4  # How many weeks to repeat

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    booking_id: str
    user_id: str
    user_name: str
    user_initials: str
    date: str
    time_slot: str
    time_display: str
    is_recurring: bool = False
    recurring_group_id: Optional[str] = None
    created_at: datetime

class WaitlistEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    waitlist_id: str
    user_id: str
    user_name: str
    user_initials: str
    date: str
    time_slot: str
    position: int
    created_at: datetime

class CreditTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str
    user_id: str
    user_name: str
    package_type: str
    credits_added: int
    amount: float
    payment_method: str
    status: str  # "pending", "confirmed"
    created_at: datetime

# ==================== HELPERS ====================

def get_initials(name: str) -> str:
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    elif len(parts) == 1 and len(parts[0]) >= 2:
        return parts[0][:2].upper()
    return "XX"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_time_display(time_slot: str) -> str:
    if time_slot == "morning":
        return "5:30 AM - 6:15 AM"
    return "9:30 AM - 10:15 AM"

async def get_time_display_from_settings(time_slot: str) -> str:
    """Get time display from database settings"""
    settings = await db.site_settings.find_one({"type": "site"}, {"_id": 0})
    if settings and "session_times" in settings:
        slot_config = settings["session_times"].get(time_slot, {})
        if slot_config.get("start") and slot_config.get("end"):
            return f"{slot_config['start']} - {slot_config['end']}"
    return get_time_display(time_slot)

async def get_current_user(request: Request) -> User:
    # Try cookie first, then Authorization header
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a session token (from Google OAuth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        user_id = session["user_id"]
    else:
        # Try JWT token
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload["user_id"]
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Convert datetime string back to datetime if needed
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return User(**user_doc)

async def get_admin_user(request: Request) -> User:
    user = await get_current_user(request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    initials = get_initials(data.name)
    
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "initials": initials,
        "password_hash": hash_password(data.password),
        "picture": None,
        "is_admin": False,
        "credits": 0,
        "has_unlimited": False,
        "profile_completed": False,
        "profile": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(dict(user_doc))
    
    token = create_jwt_token(user_id)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    del user_doc["password_hash"]
    user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return {"user": User(**user_doc), "token": token}

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user_doc["user_id"])
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    del user_doc["password_hash"]
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return {"user": User(**user_doc), "token": token}

@api_router.get("/auth/session")
async def process_google_session(session_id: str, response: Response):
    """Process Google OAuth session_id and return user data"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            oauth_data = resp.json()
    except Exception as e:
        logger.error(f"OAuth error: {e}")
        raise HTTPException(status_code=401, detail="Failed to verify session")
    
    email = oauth_data["email"]
    name = oauth_data["name"]
    picture = oauth_data.get("picture")
    session_token = oauth_data["session_token"]
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user_doc:
        # Update existing user
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture, "initials": get_initials(name)}}
        )
        user_doc["name"] = name
        user_doc["picture"] = picture
        user_doc["initials"] = get_initials(name)
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "initials": get_initials(name),
            "picture": picture,
            "is_admin": False,
            "credits": 0,
            "has_unlimited": False,
            "profile_completed": False,
            "profile": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(dict(user_doc))
    
    # Store session
    await db.user_sessions.delete_many({"user_id": user_doc["user_id"]})
    await db.user_sessions.insert_one({
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return {"user": User(**user_doc), "token": session_token}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(response: Response, request: Request):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== PROFILE ROUTES ====================

@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user: User = Depends(get_current_user)):
    profile_data = data.model_dump(exclude_none=True)
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {
            "$set": {
                "profile": profile_data,
                "profile_completed": True
            }
        }
    )
    
    return {"message": "Profile updated successfully"}

@api_router.get("/profile")
async def get_profile(user: User = Depends(get_current_user)):
    return user

# ==================== CREDITS ROUTES ====================

CREDIT_PACKAGES = {
    "single": {"credits": 1, "amount": 30.0, "name": "Single Session"},
    "double": {"credits": 2, "amount": 40.0, "name": "2 Sessions"},
    "unlimited": {"credits": 999, "amount": 50.0, "name": "Unlimited"}
}

@api_router.get("/credits/packages")
async def get_credit_packages():
    return CREDIT_PACKAGES

@api_router.post("/credits/purchase")
async def purchase_credits(data: CreditPurchase, user: User = Depends(get_current_user)):
    if data.package_type not in CREDIT_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package type")
    
    package = CREDIT_PACKAGES[data.package_type]
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    
    transaction = {
        "transaction_id": transaction_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "package_type": data.package_type,
        "credits_added": package["credits"],
        "amount": package["amount"],
        "payment_method": data.payment_method,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.credit_transactions.insert_one(dict(transaction))
    
    return {
        "transaction_id": transaction_id,
        "message": f"Please pay ${package['amount']} via {data.payment_method}. Your purchase will be confirmed by admin."
    }

@api_router.get("/credits/transactions")
async def get_my_transactions(user: User = Depends(get_current_user)):
    transactions = await db.credit_transactions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return transactions

@api_router.get("/credits/balance")
async def get_credit_balance(user: User = Depends(get_current_user)):
    return {
        "credits": user.credits,
        "has_unlimited": user.has_unlimited
    }

# ==================== BOOKING ROUTES ====================

MAX_BOOKINGS_PER_SLOT = 3

@api_router.get("/bookings/slots/{date}")
async def get_slots_for_date(date: str, user: User = Depends(get_current_user)):
    """Get available slots for a specific date"""
    # Get session times from settings
    settings = await db.site_settings.find_one({"type": "site"}, {"_id": 0})
    session_times = settings.get("session_times", DEFAULT_SITE_SETTINGS["session_times"]) if settings else DEFAULT_SITE_SETTINGS["session_times"]
    
    # Get all bookings for this date
    bookings = await db.bookings.find({"date": date}, {"_id": 0}).to_list(100)
    
    morning_bookings = [b for b in bookings if b["time_slot"] == "morning"]
    afternoon_bookings = [b for b in bookings if b["time_slot"] == "afternoon"]
    
    morning_config = session_times.get("morning", {"start": "5:30 AM", "end": "6:15 AM", "enabled": True})
    afternoon_config = session_times.get("afternoon", {"start": "9:30 AM", "end": "10:15 AM", "enabled": True})
    
    return {
        "date": date,
        "morning": {
            "time_display": f"{morning_config['start']} - {morning_config['end']}",
            "bookings": morning_bookings,
            "available_spots": MAX_BOOKINGS_PER_SLOT - len(morning_bookings),
            "is_full": len(morning_bookings) >= MAX_BOOKINGS_PER_SLOT,
            "user_booked": any(b["user_id"] == user.user_id for b in morning_bookings),
            "enabled": morning_config.get("enabled", True)
        },
        "afternoon": {
            "time_display": f"{afternoon_config['start']} - {afternoon_config['end']}",
            "bookings": afternoon_bookings,
            "available_spots": MAX_BOOKINGS_PER_SLOT - len(afternoon_bookings),
            "is_full": len(afternoon_bookings) >= MAX_BOOKINGS_PER_SLOT,
            "user_booked": any(b["user_id"] == user.user_id for b in afternoon_bookings),
            "enabled": afternoon_config.get("enabled", True)
        }
    }

@api_router.post("/bookings")
async def create_booking(data: BookingCreate, user: User = Depends(get_current_user)):
    # Check if user has credits
    if not user.has_unlimited and user.credits <= 0:
        raise HTTPException(status_code=400, detail="No credits available. Please purchase a session package.")
    
    # Check if slot is available
    existing_bookings = await db.bookings.find(
        {"date": data.date, "time_slot": data.time_slot},
        {"_id": 0}
    ).to_list(10)
    
    # Check if user already booked this slot
    if any(b["user_id"] == user.user_id for b in existing_bookings):
        raise HTTPException(status_code=400, detail="You have already booked this slot")
    
    # Check if user is already on waitlist
    existing_waitlist = await db.waitlist.find_one({
        "date": data.date, 
        "time_slot": data.time_slot,
        "user_id": user.user_id
    })
    if existing_waitlist:
        raise HTTPException(status_code=400, detail="You are already on the waitlist for this slot")
    
    # If slot is full, return info about joining waitlist
    if len(existing_bookings) >= MAX_BOOKINGS_PER_SLOT:
        raise HTTPException(
            status_code=400, 
            detail="This time slot is full. You can join the waitlist instead."
        )
    
    # Handle recurring bookings
    if data.is_recurring and data.recurring_weeks > 0:
        return await create_recurring_bookings(data, user)
    
    # Single booking
    booking_id = f"book_{uuid.uuid4().hex[:12]}"
    booking = {
        "booking_id": booking_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "user_initials": user.initials,
        "date": data.date,
        "time_slot": data.time_slot,
        "time_display": get_time_display(data.time_slot),
        "is_recurring": False,
        "recurring_group_id": None,
        "reminder_24h_sent": False,
        "reminder_1h_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Create a copy for insertion (MongoDB mutates the original)
    await db.bookings.insert_one(dict(booking))
    
    # Deduct credit if not unlimited
    if not user.has_unlimited:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$inc": {"credits": -1}}
        )
    
    # Send booking confirmation notification
    try:
        from datetime import datetime as dt
        formatted_date = dt.strptime(data.date, "%Y-%m-%d").strftime("%A, %B %d")
        await create_booking_notification(user.user_id, formatted_date, booking["time_display"], "confirmation")
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
    
    return {"booking": booking, "message": "Booking confirmed!"}


async def create_recurring_bookings(data: BookingCreate, user: User):
    """Create multiple bookings for recurring sessions"""
    recurring_group_id = f"recur_{uuid.uuid4().hex[:12]}"
    bookings_created = []
    bookings_waitlisted = []
    credits_needed = 0
    
    # Calculate all dates
    base_date = datetime.strptime(data.date, "%Y-%m-%d")
    dates_to_book = [base_date + timedelta(weeks=i) for i in range(data.recurring_weeks)]
    
    # Check credits needed (if not unlimited)
    if not user.has_unlimited:
        for book_date in dates_to_book:
            date_str = book_date.strftime("%Y-%m-%d")
            existing = await db.bookings.find({"date": date_str, "time_slot": data.time_slot}).to_list(10)
            if len(existing) < MAX_BOOKINGS_PER_SLOT:
                credits_needed += 1
        
        if user.credits < credits_needed:
            raise HTTPException(
                status_code=400, 
                detail=f"Not enough credits. Need {credits_needed}, have {user.credits}."
            )
    
    # Create bookings for each date
    for book_date in dates_to_book:
        date_str = book_date.strftime("%Y-%m-%d")
        
        # Check availability
        existing_bookings = await db.bookings.find(
            {"date": date_str, "time_slot": data.time_slot},
            {"_id": 0}
        ).to_list(10)
        
        # Skip if user already has booking on this date
        if any(b["user_id"] == user.user_id for b in existing_bookings):
            continue
        
        if len(existing_bookings) >= MAX_BOOKINGS_PER_SLOT:
            # Add to waitlist instead
            waitlist_entry = await add_to_waitlist(user, date_str, data.time_slot)
            bookings_waitlisted.append(date_str)
        else:
            # Create booking
            booking_id = f"book_{uuid.uuid4().hex[:12]}"
            booking = {
                "booking_id": booking_id,
                "user_id": user.user_id,
                "user_name": user.name,
                "user_initials": user.initials,
                "date": date_str,
                "time_slot": data.time_slot,
                "time_display": get_time_display(data.time_slot),
                "is_recurring": True,
                "recurring_group_id": recurring_group_id,
                "reminder_24h_sent": False,
                "reminder_1h_sent": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.bookings.insert_one(dict(booking))
            bookings_created.append(booking)
            
            # Deduct credit if not unlimited
            if not user.has_unlimited:
                await db.users.update_one(
                    {"user_id": user.user_id},
                    {"$inc": {"credits": -1}}
                )
    
    # Send notification for recurring bookings
    if bookings_created:
        await create_booking_notification(
            user.user_id,
            f"{len(bookings_created)} sessions",
            f"Weekly {data.time_slot} sessions",
            "recurring_confirmation"
        )
    
    return {
        "bookings": bookings_created,
        "waitlisted_dates": bookings_waitlisted,
        "message": f"Created {len(bookings_created)} bookings. {len(bookings_waitlisted)} dates added to waitlist."
    }

@api_router.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str, user: User = Depends(get_current_user)):
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["user_id"] != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")
    
    # Check if booking is in the future (can only cancel future bookings)
    booking_date = datetime.strptime(booking["date"], "%Y-%m-%d").date()
    if booking_date < datetime.now(timezone.utc).date():
        raise HTTPException(status_code=400, detail="Cannot cancel past bookings")
    
    await db.bookings.delete_one({"booking_id": booking_id})
    
    # Refund credit if not unlimited
    target_user = await db.users.find_one({"user_id": booking["user_id"]}, {"_id": 0})
    if target_user and not target_user.get("has_unlimited", False):
        await db.users.update_one(
            {"user_id": booking["user_id"]},
            {"$inc": {"credits": 1}}
        )
    
    # Check waitlist and promote first person
    await promote_from_waitlist(booking["date"], booking["time_slot"])
    
    return {"message": "Booking cancelled and credit refunded"}


async def add_to_waitlist(user: User, date: str, time_slot: str) -> dict:
    """Add user to waitlist for a specific slot"""
    # Get current waitlist count for position
    waitlist_count = await db.waitlist.count_documents({
        "date": date,
        "time_slot": time_slot
    })
    
    waitlist_id = f"wait_{uuid.uuid4().hex[:12]}"
    entry = {
        "waitlist_id": waitlist_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "user_initials": user.initials,
        "date": date,
        "time_slot": time_slot,
        "position": waitlist_count + 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.waitlist.insert_one(dict(entry))
    return entry


async def promote_from_waitlist(date: str, time_slot: str):
    """Promote first person from waitlist when a spot opens"""
    # Get first person on waitlist
    first_in_line = await db.waitlist.find_one(
        {"date": date, "time_slot": time_slot},
        {"_id": 0},
        sort=[("position", 1)]
    )
    
    if not first_in_line:
        return None
    
    # Get user details
    waitlist_user = await db.users.find_one(
        {"user_id": first_in_line["user_id"]},
        {"_id": 0}
    )
    
    if not waitlist_user:
        # User no longer exists, remove from waitlist and try next
        await db.waitlist.delete_one({"waitlist_id": first_in_line["waitlist_id"]})
        return await promote_from_waitlist(date, time_slot)
    
    # Check if user has credits
    if not waitlist_user.get("has_unlimited") and waitlist_user.get("credits", 0) <= 0:
        # User has no credits, notify them and skip
        await create_booking_notification(
            first_in_line["user_id"],
            date,
            get_time_display(time_slot),
            "waitlist_no_credits"
        )
        await db.waitlist.delete_one({"waitlist_id": first_in_line["waitlist_id"]})
        # Reorder remaining waitlist
        await reorder_waitlist(date, time_slot)
        return await promote_from_waitlist(date, time_slot)
    
    # Create booking for waitlisted user
    booking_id = f"book_{uuid.uuid4().hex[:12]}"
    booking = {
        "booking_id": booking_id,
        "user_id": first_in_line["user_id"],
        "user_name": first_in_line["user_name"],
        "user_initials": first_in_line["user_initials"],
        "date": date,
        "time_slot": time_slot,
        "time_display": get_time_display(time_slot),
        "is_recurring": False,
        "recurring_group_id": None,
        "from_waitlist": True,
        "reminder_24h_sent": False,
        "reminder_1h_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(dict(booking))
    
    # Deduct credit if not unlimited
    if not waitlist_user.get("has_unlimited"):
        await db.users.update_one(
            {"user_id": first_in_line["user_id"]},
            {"$inc": {"credits": -1}}
        )
    
    # Remove from waitlist
    await db.waitlist.delete_one({"waitlist_id": first_in_line["waitlist_id"]})
    
    # Reorder remaining waitlist
    await reorder_waitlist(date, time_slot)
    
    # Send notification to promoted user
    formatted_date = datetime.strptime(date, "%Y-%m-%d").strftime("%A, %B %d")
    await create_booking_notification(
        first_in_line["user_id"],
        formatted_date,
        get_time_display(time_slot),
        "waitlist_promoted"
    )
    
    logger.info(f"Promoted {first_in_line['user_name']} from waitlist for {date} {time_slot}")
    return booking


async def reorder_waitlist(date: str, time_slot: str):
    """Reorder waitlist positions after someone is removed"""
    waitlist_entries = await db.waitlist.find(
        {"date": date, "time_slot": time_slot},
        {"_id": 0}
    ).sort("position", 1).to_list(100)
    
    for i, entry in enumerate(waitlist_entries):
        await db.waitlist.update_one(
            {"waitlist_id": entry["waitlist_id"]},
            {"$set": {"position": i + 1}}
        )

@api_router.get("/bookings/my")
async def get_my_bookings(user: User = Depends(get_current_user)):
    bookings = await db.bookings.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("date", 1).to_list(100)
    return bookings

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/bookings")
async def admin_get_all_bookings(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: User = Depends(get_admin_user)
):
    query = {}
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return bookings

@api_router.get("/admin/clients")
async def admin_get_all_clients(user: User = Depends(get_admin_user)):
    clients = await db.users.find(
        {"is_admin": False},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    # Convert datetime strings
    for client in clients:
        if isinstance(client.get("created_at"), str):
            client["created_at"] = datetime.fromisoformat(client["created_at"])
    
    return clients

@api_router.get("/admin/transactions")
async def admin_get_all_transactions(
    status: Optional[str] = None,
    user: User = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status
    
    transactions = await db.credit_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return transactions

@api_router.put("/admin/transactions/{transaction_id}/confirm")
async def admin_confirm_transaction(transaction_id: str, user: User = Depends(get_admin_user)):
    transaction = await db.credit_transactions.find_one(
        {"transaction_id": transaction_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction["status"] == "confirmed":
        raise HTTPException(status_code=400, detail="Transaction already confirmed")
    
    # Update transaction status
    await db.credit_transactions.update_one(
        {"transaction_id": transaction_id},
        {"$set": {"status": "confirmed"}}
    )
    
    # Add credits to user
    package_type = transaction["package_type"]
    if package_type == "unlimited":
        await db.users.update_one(
            {"user_id": transaction["user_id"]},
            {"$set": {"has_unlimited": True, "credits": 999}}
        )
    else:
        credits_to_add = CREDIT_PACKAGES[package_type]["credits"]
        await db.users.update_one(
            {"user_id": transaction["user_id"]},
            {"$inc": {"credits": credits_to_add}}
        )
    
    return {"message": "Transaction confirmed and credits added"}

@api_router.put("/admin/users/{user_id}/make-admin")
async def admin_make_user_admin(user_id: str, user: User = Depends(get_admin_user)):
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_admin": True}}
    )
    return {"message": "User is now an admin"}

@api_router.put("/admin/users/{user_id}/profile")
async def admin_update_user_profile(user_id: str, request: Request, user: User = Depends(get_admin_user)):
    """Admin can update any user's profile"""
    data = await request.json()
    
    # Find the user
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update allowed fields
    update_fields = {}
    
    # Basic info
    if "name" in data:
        update_fields["name"] = data["name"]
        update_fields["initials"] = get_initials(data["name"])
    if "email" in data:
        update_fields["email"] = data["email"]
    if "credits" in data:
        update_fields["credits"] = int(data["credits"])
    if "has_unlimited" in data:
        update_fields["has_unlimited"] = bool(data["has_unlimited"])
    
    # Profile info
    profile_fields = ["phone", "age", "fitness_goals", "health_conditions", "previous_injuries", "emergency_contact_name", "emergency_contact_phone"]
    profile_update = target_user.get("profile", {}) or {}
    
    for field in profile_fields:
        if field in data:
            if field == "age" and data[field]:
                profile_update[field] = int(data[field])
            else:
                profile_update[field] = data[field]
    
    if profile_update:
        update_fields["profile"] = profile_update
        update_fields["profile_completed"] = True
    
    if update_fields:
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_fields}
        )
    
    # Get updated user
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"message": "Profile updated successfully", "user": updated_user}

@api_router.delete("/admin/bookings/{booking_id}")
async def admin_cancel_booking(booking_id: str, user: User = Depends(get_admin_user)):
    return await cancel_booking(booking_id, user)

# ==================== SITE SETTINGS ====================

DEFAULT_SITE_SETTINGS = {
    "hero_image": "https://customer-assets.emergentagent.com/job_fitness-booking-9/artifacts/mdv3ltvt_1000026645.jpg",
    "about_image": "https://customer-assets.emergentagent.com/job_fitness-booking-9/artifacts/mdv3ltvt_1000026645.jpg",
    "gallery_images": [],
    "site_title": "Stephanie Anderson Personal Training",
    "site_tagline": "Personal Training & Small Group Fitness",
    "hero_heading": "Train with Stephanie Anderson",
    "hero_subheading": "Experience personalized fitness training designed to help you achieve your goals. Book sessions easily and join our supportive fitness community.",
    "about_title": "Why Train With Us",
    "about_text": "Get the personalized attention you deserve with our boutique fitness experience.",
    "feature_1_title": "Easy Booking",
    "feature_1_text": "Book your sessions with just a few clicks. See availability in real-time.",
    "feature_2_title": "Small Groups",
    "feature_2_text": "Maximum 3 people per session for personalized attention and results.",
    "feature_3_title": "Flexible Plans",
    "feature_3_text": "Choose from single sessions, multi-packs, or unlimited weekly access.",
    "cta_title": "Ready to Start Your Fitness Journey?",
    "cta_text": "Join us today and experience the difference personalized training can make in your life.",
    "session_times": {
        "morning": {"start": "5:30 AM", "end": "6:15 AM", "enabled": True},
        "afternoon": {"start": "9:30 AM", "end": "10:15 AM", "enabled": True}
    },
    "theme": {
        "primary_color": "#F5D5D5",
        "secondary_color": "#E8B4B4",
        "accent_color": "#1A1A1A",
        "success_color": "#8FB392"
    }
}

@api_router.get("/settings")
async def get_site_settings():
    """Get site settings (public endpoint)"""
    settings = await db.site_settings.find_one({"type": "site"}, {"_id": 0})
    if not settings:
        return DEFAULT_SITE_SETTINGS
    # Merge with defaults for any missing fields
    merged = {**DEFAULT_SITE_SETTINGS, **settings}
    return merged

@api_router.put("/admin/settings")
async def update_site_settings(request: Request, user: User = Depends(get_admin_user)):
    """Update site settings (admin only)"""
    data = await request.json()
    
    # Get current settings or defaults
    current = await db.site_settings.find_one({"type": "site"}, {"_id": 0})
    if not current:
        current = dict(DEFAULT_SITE_SETTINGS)
    
    # Update with new values - allow all text fields
    allowed_fields = [
        "hero_image", "about_image", "gallery_images", "site_title", "site_tagline",
        "hero_heading", "hero_subheading", "about_title", "about_text",
        "feature_1_title", "feature_1_text", "feature_2_title", "feature_2_text",
        "feature_3_title", "feature_3_text", "cta_title", "cta_text",
        "session_times", "theme"
    ]
    for field in allowed_fields:
        if field in data:
            current[field] = data[field]
    
    current["type"] = "site"
    current["updated_at"] = datetime.now(timezone.utc).isoformat()
    current["updated_by"] = user.user_id
    
    await db.site_settings.update_one(
        {"type": "site"},
        {"$set": current},
        upsert=True
    )
    
    return {"message": "Settings updated successfully", "settings": current}

# ==================== PUSH NOTIFICATIONS ====================

class PushSubscription(BaseModel):
    subscription: Dict[str, Any]

class NotificationPayload(BaseModel):
    title: str
    body: str
    icon: Optional[str] = "/logo192.png"
    tag: Optional[str] = "sapt-notification"
    url: Optional[str] = "/dashboard"
    
@api_router.post("/notifications/subscribe")
async def subscribe_to_notifications(data: PushSubscription, user: User = Depends(get_current_user)):
    """Subscribe user to push notifications"""
    subscription_data = {
        "user_id": user.user_id,
        "subscription": data.subscription,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True
    }
    
    # Update or insert subscription
    await db.push_subscriptions.update_one(
        {"user_id": user.user_id},
        {"$set": subscription_data},
        upsert=True
    )
    
    return {"message": "Subscribed to notifications"}

@api_router.post("/notifications/unsubscribe")
async def unsubscribe_from_notifications(request: Request, user: User = Depends(get_current_user)):
    """Unsubscribe user from push notifications"""
    data = await request.json()
    endpoint = data.get("endpoint")
    
    await db.push_subscriptions.update_one(
        {"user_id": user.user_id},
        {"$set": {"active": False}}
    )
    
    return {"message": "Unsubscribed from notifications"}

@api_router.get("/notifications/status")
async def get_notification_status(user: User = Depends(get_current_user)):
    """Check if user is subscribed to notifications"""
    subscription = await db.push_subscriptions.find_one(
        {"user_id": user.user_id, "active": True},
        {"_id": 0}
    )
    return {"subscribed": subscription is not None}

@api_router.post("/notifications/test")
async def send_test_notification(user: User = Depends(get_current_user)):
    """Send a test notification to the current user"""
    subscription = await db.push_subscriptions.find_one(
        {"user_id": user.user_id, "active": True},
        {"_id": 0}
    )
    
    if not subscription:
        raise HTTPException(status_code=400, detail="Not subscribed to notifications")
    
    # Store notification for client to poll
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "title": "Test Notification",
        "body": "Push notifications are working! 🎉",
        "icon": "/logo192.png",
        "url": "/dashboard",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(dict(notification))
    
    return {"message": "Test notification sent", "notification": notification}

@api_router.get("/notifications")
async def get_notifications(user: User = Depends(get_current_user)):
    """Get user's notifications"""
    notifications = await db.notifications.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@api_router.get("/notifications/unread")
async def get_unread_notifications(user: User = Depends(get_current_user)):
    """Get user's unread notifications for polling"""
    notifications = await db.notifications.find(
        {"user_id": user.user_id, "read": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: User = Depends(get_current_user)):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user.user_id},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: User = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user.user_id},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

async def create_booking_notification(user_id: str, booking_date: str, time_display: str, notification_type: str = "confirmation"):
    """Create a notification for booking events"""
    if notification_type == "confirmation":
        title = "Booking Confirmed! ✓"
        body = f"Your session on {booking_date} at {time_display} has been booked."
    elif notification_type == "reminder_24h":
        title = "Session Tomorrow 📅"
        body = f"Reminder: You have a training session tomorrow at {time_display}."
    elif notification_type == "reminder_1h":
        title = "Session in 1 Hour ⏰"
        body = f"Your training session starts in 1 hour at {time_display}. Get ready!"
    else:
        title = "SAPT Notification"
        body = f"Session: {booking_date} at {time_display}"
    
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "title": title,
        "body": body,
        "icon": "/logo192.png",
        "url": "/bookings",
        "type": notification_type,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(dict(notification))
    return notification

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
