"""
Test suite for SAPT Fitness Booking - Notification System
Tests all notification-related endpoints and booking notification integration
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNotificationSystem:
    """Notification system endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sapt.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.user_id = data.get("user", {}).get("user_id")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_notifications(self):
        """Test GET /api/notifications returns user notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # If there are notifications, verify structure
        if len(data) > 0:
            notif = data[0]
            assert "notification_id" in notif
            assert "user_id" in notif
            assert "title" in notif
            assert "body" in notif
            assert "read" in notif
            assert "created_at" in notif
    
    def test_subscribe_to_notifications(self):
        """Test POST /api/notifications/subscribe stores subscription"""
        subscription_data = {
            "subscription": {
                "endpoint": f"https://test.endpoint.com/push/test_{int(time.time())}",
                "keys": {
                    "p256dh": "test_p256dh_key",
                    "auth": "test_auth_key"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/subscribe",
            headers=self.headers,
            json=subscription_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Subscribed to notifications"
    
    def test_notification_status_after_subscribe(self):
        """Test GET /api/notifications/status returns subscribed status"""
        # First subscribe
        subscription_data = {
            "subscription": {
                "endpoint": f"https://test.endpoint.com/push/status_test_{int(time.time())}",
                "keys": {"p256dh": "test_key", "auth": "test_auth"}
            }
        }
        requests.post(f"{BASE_URL}/api/notifications/subscribe", headers=self.headers, json=subscription_data)
        
        # Check status
        response = requests.get(f"{BASE_URL}/api/notifications/status", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "subscribed" in data
        assert data["subscribed"] == True
    
    def test_send_test_notification(self):
        """Test POST /api/notifications/test creates test notification in database"""
        # First subscribe
        subscription_data = {
            "subscription": {
                "endpoint": f"https://test.endpoint.com/push/test_notif_{int(time.time())}",
                "keys": {"p256dh": "test_key", "auth": "test_auth"}
            }
        }
        requests.post(f"{BASE_URL}/api/notifications/subscribe", headers=self.headers, json=subscription_data)
        
        # Get current notification count
        before_response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        before_count = len(before_response.json())
        
        # Send test notification
        response = requests.post(f"{BASE_URL}/api/notifications/test", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Test notification sent"
        assert "notification" in data
        assert data["notification"]["title"] == "Test Notification"
        assert data["notification"]["body"] == "Push notifications are working! 🎉"
        
        # Verify notification was created in database
        after_response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        after_count = len(after_response.json())
        assert after_count > before_count, "Test notification should be added to database"
    
    def test_get_unread_notifications(self):
        """Test GET /api/notifications/unread returns only unread notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned notifications should be unread
        for notif in data:
            assert notif.get("read") == False
    
    def test_mark_notification_as_read(self):
        """Test PUT /api/notifications/{id}/read marks notification as read"""
        # First subscribe and create a test notification
        subscription_data = {
            "subscription": {
                "endpoint": f"https://test.endpoint.com/push/mark_read_{int(time.time())}",
                "keys": {"p256dh": "test_key", "auth": "test_auth"}
            }
        }
        requests.post(f"{BASE_URL}/api/notifications/subscribe", headers=self.headers, json=subscription_data)
        
        # Create test notification
        test_response = requests.post(f"{BASE_URL}/api/notifications/test", headers=self.headers)
        notification_id = test_response.json().get("notification", {}).get("notification_id")
        
        # Mark as read
        response = requests.put(
            f"{BASE_URL}/api/notifications/{notification_id}/read",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Notification marked as read"
        
        # Verify it's no longer in unread list
        unread_response = requests.get(f"{BASE_URL}/api/notifications/unread", headers=self.headers)
        unread_ids = [n["notification_id"] for n in unread_response.json()]
        assert notification_id not in unread_ids
    
    def test_mark_all_notifications_as_read(self):
        """Test PUT /api/notifications/read-all marks all notifications as read"""
        # First subscribe
        subscription_data = {
            "subscription": {
                "endpoint": f"https://test.endpoint.com/push/mark_all_{int(time.time())}",
                "keys": {"p256dh": "test_key", "auth": "test_auth"}
            }
        }
        requests.post(f"{BASE_URL}/api/notifications/subscribe", headers=self.headers, json=subscription_data)
        
        # Create a couple test notifications
        requests.post(f"{BASE_URL}/api/notifications/test", headers=self.headers)
        requests.post(f"{BASE_URL}/api/notifications/test", headers=self.headers)
        
        # Mark all as read
        response = requests.put(f"{BASE_URL}/api/notifications/read-all", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "All notifications marked as read"
        
        # Verify no unread notifications
        unread_response = requests.get(f"{BASE_URL}/api/notifications/unread", headers=self.headers)
        assert len(unread_response.json()) == 0
    
    def test_unsubscribe_from_notifications(self):
        """Test POST /api/notifications/unsubscribe removes subscription"""
        # First subscribe
        endpoint = f"https://test.endpoint.com/push/unsub_{int(time.time())}"
        subscription_data = {
            "subscription": {
                "endpoint": endpoint,
                "keys": {"p256dh": "test_key", "auth": "test_auth"}
            }
        }
        requests.post(f"{BASE_URL}/api/notifications/subscribe", headers=self.headers, json=subscription_data)
        
        # Unsubscribe
        response = requests.post(
            f"{BASE_URL}/api/notifications/unsubscribe",
            headers=self.headers,
            json={"endpoint": endpoint}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Unsubscribed from notifications"
        
        # Verify status is now unsubscribed
        status_response = requests.get(f"{BASE_URL}/api/notifications/status", headers=self.headers)
        assert status_response.json().get("subscribed") == False
    
    def test_booking_creates_notification(self):
        """Test that creating a booking generates a confirmation notification"""
        # Get current notification count
        before_response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        before_count = len(before_response.json())
        
        # Create a booking for a future date
        booking_date = "2026-03-15"
        booking_response = requests.post(
            f"{BASE_URL}/api/bookings",
            headers=self.headers,
            json={"date": booking_date, "time_slot": "afternoon"}
        )
        
        # Booking might fail if slot is full or already booked, that's ok
        if booking_response.status_code == 200:
            # Verify notification was created
            after_response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
            after_count = len(after_response.json())
            
            assert after_count > before_count, "Booking should create a notification"
            
            # Check the latest notification is a booking confirmation
            latest_notif = after_response.json()[0]
            assert "Booking Confirmed" in latest_notif.get("title", "")
            assert booking_date.replace("-", "") in latest_notif.get("body", "").replace(",", "").replace(" ", "") or "March" in latest_notif.get("body", "")
    
    def test_notification_requires_auth(self):
        """Test that notification endpoints require authentication"""
        # Test without auth header
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401
        
        response = requests.post(f"{BASE_URL}/api/notifications/subscribe", json={"subscription": {}})
        assert response.status_code == 401
        
        response = requests.post(f"{BASE_URL}/api/notifications/test")
        assert response.status_code == 401


class TestNotificationEdgeCases:
    """Edge case tests for notification system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sapt.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_test_notification_requires_subscription(self):
        """Test that sending test notification requires active subscription"""
        # First unsubscribe
        requests.post(
            f"{BASE_URL}/api/notifications/unsubscribe",
            headers=self.headers,
            json={"endpoint": "any"}
        )
        
        # Try to send test notification
        response = requests.post(f"{BASE_URL}/api/notifications/test", headers=self.headers)
        
        # Should fail with 400 because not subscribed
        assert response.status_code == 400
        assert "Not subscribed" in response.json().get("detail", "")
    
    def test_mark_nonexistent_notification_as_read(self):
        """Test marking a non-existent notification as read"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/nonexistent_id_12345/read",
            headers=self.headers
        )
        
        # Should succeed (no-op) or return 404
        assert response.status_code in [200, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
