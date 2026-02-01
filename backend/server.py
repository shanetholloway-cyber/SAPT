from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'sapt-fitness-secret-key-2024')
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

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    booking_id: str
    user_id: str
    user_name: str
    user_initials: str
    date: str
    time_slot: str
    time_display: str
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
    # Get all bookings for this date
    bookings = await db.bookings.find({"date": date}, {"_id": 0}).to_list(100)
    
    morning_bookings = [b for b in bookings if b["time_slot"] == "morning"]
    afternoon_bookings = [b for b in bookings if b["time_slot"] == "afternoon"]
    
    return {
        "date": date,
        "morning": {
            "time_display": "5:30 AM - 6:15 AM",
            "bookings": morning_bookings,
            "available_spots": MAX_BOOKINGS_PER_SLOT - len(morning_bookings),
            "is_full": len(morning_bookings) >= MAX_BOOKINGS_PER_SLOT,
            "user_booked": any(b["user_id"] == user.user_id for b in morning_bookings)
        },
        "afternoon": {
            "time_display": "9:30 AM - 10:15 AM",
            "bookings": afternoon_bookings,
            "available_spots": MAX_BOOKINGS_PER_SLOT - len(afternoon_bookings),
            "is_full": len(afternoon_bookings) >= MAX_BOOKINGS_PER_SLOT,
            "user_booked": any(b["user_id"] == user.user_id for b in afternoon_bookings)
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
    
    if len(existing_bookings) >= MAX_BOOKINGS_PER_SLOT:
        raise HTTPException(status_code=400, detail="This time slot is full")
    
    # Check if user already booked this slot
    if any(b["user_id"] == user.user_id for b in existing_bookings):
        raise HTTPException(status_code=400, detail="You have already booked this slot")
    
    booking_id = f"book_{uuid.uuid4().hex[:12]}"
    booking = {
        "booking_id": booking_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "user_initials": user.initials,
        "date": data.date,
        "time_slot": data.time_slot,
        "time_display": get_time_display(data.time_slot),
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
    
    return {"booking": booking, "message": "Booking confirmed!"}

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
    
    return {"message": "Booking cancelled and credit refunded"}

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
    
    # Update with new values
    allowed_fields = ["hero_image", "about_image", "gallery_images", "site_title", "site_tagline", "session_times", "theme"]
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
