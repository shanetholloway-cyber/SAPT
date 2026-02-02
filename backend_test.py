import requests
import sys
import json
from datetime import datetime, timedelta

class FitnessBookingAPITester:
    def __init__(self, base_url="https://sapt-booking.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_token = None
        self.test_user_id = None
        self.test_booking_id = None
        self.test_transaction_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        return success

    def test_health_check(self):
        """Test health endpoint"""
        try:
            response = self.session.get(f"{self.api_url}/health")
            success = response.status_code == 200
            return self.log_test("Health Check", success, 
                               f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            return self.log_test("Health Check", False, str(e))

    def test_user_registration(self):
        """Test user registration"""
        try:
            timestamp = int(datetime.now().timestamp())
            test_data = {
                "email": f"test.user.{timestamp}@example.com",
                "password": "TestPass123!",
                "name": "Test User"
            }
            
            response = self.session.post(f"{self.api_url}/auth/register", json=test_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.token = data.get("token")
                self.test_user_id = data.get("user", {}).get("user_id")
                
            return self.log_test("User Registration", success,
                               f"Status: {response.status_code}, Response: {response.text[:200]}" if not success else "")
        except Exception as e:
            return self.log_test("User Registration", False, str(e))

    def test_user_login(self):
        """Test user login with admin credentials"""
        try:
            login_data = {
                "email": "admin@sapt.com",
                "password": "admin123"
            }
            
            response = self.session.post(f"{self.api_url}/auth/login", json=login_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.admin_token = data.get("token")
                
            return self.log_test("Admin Login", success,
                               f"Status: {response.status_code}, Response: {response.text[:200]}" if not success else "")
        except Exception as e:
            return self.log_test("Admin Login", False, str(e))

    def test_auth_me(self):
        """Test getting current user info"""
        if not self.token:
            return self.log_test("Auth Me", False, "No token available")
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.get(f"{self.api_url}/auth/me", headers=headers)
            success = response.status_code == 200
            
            return self.log_test("Auth Me", success,
                               f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            return self.log_test("Auth Me", False, str(e))

    def test_profile_update(self):
        """Test profile update"""
        if not self.token:
            return self.log_test("Profile Update", False, "No token available")
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            profile_data = {
                "phone": "555-0123",
                "age": 30,
                "fitness_goals": "Weight loss and strength building",
                "health_conditions": "None",
                "previous_injuries": "None",
                "emergency_contact_name": "Jane Doe",
                "emergency_contact_phone": "555-0124"
            }
            
            response = self.session.put(f"{self.api_url}/profile", json=profile_data, headers=headers)
            success = response.status_code == 200
            
            return self.log_test("Profile Update", success,
                               f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            return self.log_test("Profile Update", False, str(e))

    def test_credit_packages(self):
        """Test getting credit packages"""
        try:
            response = self.session.get(f"{self.api_url}/credits/packages")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                expected_packages = ["single", "double", "unlimited"]
                has_all_packages = all(pkg in data for pkg in expected_packages)
                success = success and has_all_packages
                
            return self.log_test("Credit Packages", success,
                               f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            return self.log_test("Credit Packages", False, str(e))

    def test_credit_purchase(self):
        """Test credit purchase request"""
        if not self.token:
            return self.log_test("Credit Purchase", False, "No token available")
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            purchase_data = {
                "package_type": "single",
                "payment_method": "cash"
            }
            
            response = self.session.post(f"{self.api_url}/credits/purchase", json=purchase_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.test_transaction_id = data.get("transaction_id")
                
            return self.log_test("Credit Purchase", success,
                               f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            return self.log_test("Credit Purchase", False, str(e))

    def test_booking_slots(self):
        """Test getting booking slots for a date"""
        if not self.token:
            return self.log_test("Booking Slots", False, "No token available")
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            
            response = self.session.get(f"{self.api_url}/bookings/slots/{tomorrow}", headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_morning = "morning" in data
                has_afternoon = "afternoon" in data
                success = success and has_morning and has_afternoon
                
            return self.log_test("Booking Slots", success,
                               f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            return self.log_test("Booking Slots", False, str(e))

    def test_create_booking(self):
        """Test creating a booking"""
        if not self.admin_token:
            return self.log_test("Create Booking", False, "No admin token available")
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            booking_data = {
                "date": tomorrow,
                "time_slot": "morning"
            }
            
            response = self.session.post(f"{self.api_url}/bookings", json=booking_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.test_booking_id = data.get("booking", {}).get("booking_id")
                
            return self.log_test("Create Booking", success,
                               f"Status: {response.status_code}, Response: {response.text[:200]}" if not success else "")
        except Exception as e:
            return self.log_test("Create Booking", False, str(e))

    def test_my_bookings(self):
        """Test getting user's bookings"""
        if not self.admin_token:
            return self.log_test("My Bookings", False, "No admin token available")
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{self.api_url}/bookings/my", headers=headers)
            success = response.status_code == 200
            
            return self.log_test("My Bookings", success,
                               f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            return self.log_test("My Bookings", False, str(e))

    def test_admin_bookings(self):
        """Test admin getting all bookings"""
        if not self.admin_token:
            return self.log_test("Admin Bookings", False, "No admin token available")
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{self.api_url}/admin/bookings", headers=headers)
            success = response.status_code == 200
            
            return self.log_test("Admin Bookings", success,
                               f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            return self.log_test("Admin Bookings", False, str(e))

    def test_admin_clients(self):
        """Test admin getting all clients"""
        if not self.admin_token:
            return self.log_test("Admin Clients", False, "No admin token available")
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{self.api_url}/admin/clients", headers=headers)
            success = response.status_code == 200
            
            return self.log_test("Admin Clients", success,
                               f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            return self.log_test("Admin Clients", False, str(e))

    def test_admin_transactions(self):
        """Test admin getting all transactions"""
        if not self.admin_token:
            return self.log_test("Admin Transactions", False, "No admin token available")
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{self.api_url}/admin/transactions", headers=headers)
            success = response.status_code == 200
            
            return self.log_test("Admin Transactions", success,
                               f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            return self.log_test("Admin Transactions", False, str(e))

    def test_admin_confirm_transaction(self):
        """Test admin confirming a transaction"""
        if not self.admin_token or not self.test_transaction_id:
            return self.log_test("Admin Confirm Transaction", False, "No admin token or transaction ID available")
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.put(f"{self.api_url}/admin/transactions/{self.test_transaction_id}/confirm", headers=headers)
            success = response.status_code == 200
            
            return self.log_test("Admin Confirm Transaction", success,
                               f"Status: {response.status_code}" if not success else "")
        except Exception as e:
            return self.log_test("Admin Confirm Transaction", False, str(e))

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Fitness Booking API Tests")
        print("=" * 50)
        
        # Basic tests
        self.test_health_check()
        
        # Auth tests
        self.test_user_registration()
        self.test_user_login()
        self.test_auth_me()
        
        # Profile tests
        self.test_profile_update()
        
        # Credit tests
        self.test_credit_packages()
        self.test_credit_purchase()
        
        # Booking tests
        self.test_booking_slots()
        self.test_create_booking()
        self.test_my_bookings()
        
        # Admin tests
        self.test_admin_bookings()
        self.test_admin_clients()
        self.test_admin_transactions()
        self.test_admin_confirm_transaction()
        
        # Results
        print("=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = FitnessBookingAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())