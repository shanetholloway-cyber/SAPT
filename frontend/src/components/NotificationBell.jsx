import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, X, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import usePushNotifications from "@/hooks/usePushNotifications";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe, showLocalNotification, loading } = usePushNotifications();

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.read).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  // Poll for unread notifications and show them
  const checkUnreadNotifications = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/notifications/unread`);
      const unread = response.data;
      
      // Show local notification for new ones
      for (const notif of unread) {
        if (isSubscribed && permission === 'granted') {
          await showLocalNotification(notif.title, {
            body: notif.body,
            tag: notif.notification_id,
            data: { url: notif.url }
          });
        }
      }
      
      setUnreadCount(unread.length);
    } catch (error) {
      // Silently fail for polling
    }
  }, [isSubscribed, permission, showLocalNotification]);

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      if (isSubscribed) {
        checkUnreadNotifications();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchNotifications, checkUnreadNotifications, isSubscribed]);

  const handleSubscribe = async () => {
    try {
      await subscribe();
      toast.success("Notifications enabled! You'll receive booking reminders.");
      fetchNotifications();
    } catch (error) {
      if (error.message === 'Notification permission denied') {
        toast.error("Please allow notifications in your browser settings");
      } else {
        toast.error("Failed to enable notifications");
      }
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe();
      toast.success("Notifications disabled");
    } catch (error) {
      toast.error("Failed to disable notifications");
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`);
      fetchNotifications();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const sendTestNotification = async () => {
    try {
      await axios.post(`${API}/notifications/test`);
      toast.success("Test notification sent!");
      setTimeout(fetchNotifications, 1000);
      
      // Also show local notification
      if (permission === 'granted') {
        await showLocalNotification("Test Notification", {
          body: "Push notifications are working! 🎉",
          tag: "test-notification"
        });
      }
    } catch (error) {
      toast.error("Failed to send test notification");
    }
  };

  if (!isSupported) {
    return null; // Don't show bell if not supported
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-[#F5F5F5] transition-colors" data-testid="notification-bell">
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-[#1A1A1A]" />
          ) : (
            <BellOff className="w-5 h-5 text-[#737373]" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#D97575] text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 flex items-center justify-between">
          <h3 className="font-semibold text-[#1A1A1A]">Notifications</h3>
          {isSubscribed ? (
            <Button variant="ghost" size="sm" onClick={handleUnsubscribe} className="text-xs text-[#737373]">
              <BellOff className="w-3 h-3 mr-1" /> Disable
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleSubscribe} disabled={loading} className="text-xs text-[#8FB392]">
              <Bell className="w-3 h-3 mr-1" /> Enable
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {!isSubscribed ? (
          <div className="px-4 py-6 text-center">
            <BellOff className="w-10 h-10 mx-auto mb-3 text-[#737373] opacity-50" />
            <p className="text-sm text-[#737373] mb-3">Enable notifications to get booking confirmations and session reminders</p>
            <Button onClick={handleSubscribe} disabled={loading} className="btn-secondary text-sm h-9">
              <Bell className="w-4 h-4 mr-2" /> Enable Notifications
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <Bell className="w-10 h-10 mx-auto mb-3 text-[#737373] opacity-50" />
            <p className="text-sm text-[#737373]">No notifications yet</p>
            <Button onClick={sendTestNotification} variant="ghost" size="sm" className="mt-2 text-xs">
              Send test notification
            </Button>
          </div>
        ) : (
          <>
            <div className="max-h-80 overflow-y-auto">
              {notifications.slice(0, 10).map((notif) => (
                <DropdownMenuItem key={notif.notification_id} className="px-3 py-3 cursor-pointer" onClick={() => markAsRead(notif.notification_id)}>
                  <div className="flex gap-3 w-full">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.read ? "bg-transparent" : "bg-[#F5D5D5]"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${notif.read ? "text-[#737373]" : "text-[#1A1A1A] font-medium"}`}>{notif.title}</p>
                      <p className="text-xs text-[#737373] truncate">{notif.body}</p>
                      <p className="text-xs text-[#A0A0A0] mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                    </div>
                    {!notif.read && (
                      <Check className="w-4 h-4 text-[#8FB392] flex-shrink-0" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 flex justify-between">
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                Mark all as read
              </Button>
              <Button variant="ghost" size="sm" onClick={sendTestNotification} className="text-xs text-[#737373]">
                Test
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
