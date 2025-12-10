import { db } from "@/integrations/firebase/client";
import { collection, addDoc, query, where, getDocs, updateDoc, doc, orderBy, limit, Timestamp } from "firebase/firestore";
import { getDoc } from "firebase/firestore";

export interface Notification {
  id?: string;
  userId: string;
  type: 'issue_update' | 'payment_reminder' | 'maintenance_alert' | 'new_message' | 'property_added' | 'resident_added';
  title: string;
  message: string;
  read: boolean;
  createdAt: string | Timestamp;
  link?: string;
  metadata?: any;
}

// Get user's notification preferences
export const getUserNotificationPreferences = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.notificationPreferences || {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        issueUpdates: true,
        paymentReminders: true,
        maintenanceAlerts: true,
        newMessages: true,
      };
    }
    return {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      issueUpdates: true,
      paymentReminders: true,
      maintenanceAlerts: true,
      newMessages: true,
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return null;
  }
};

// Create a notification
export const createNotification = async (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
  try {
    // Check user preferences
    const preferences = await getUserNotificationPreferences(notification.userId);
    if (!preferences) return null;

    // Check if this type of notification is enabled
    let isEnabled = true;
    switch (notification.type) {
      case 'issue_update':
        isEnabled = preferences.issueUpdates && preferences.pushNotifications;
        break;
      case 'payment_reminder':
        isEnabled = preferences.paymentReminders && preferences.pushNotifications;
        break;
      case 'maintenance_alert':
        isEnabled = preferences.maintenanceAlerts && preferences.pushNotifications;
        break;
      case 'new_message':
        isEnabled = preferences.newMessages && preferences.pushNotifications;
        break;
      default:
        isEnabled = preferences.pushNotifications;
    }

    if (!isEnabled) {
      console.log('Notification disabled by user preferences');
      return null;
    }

    const notificationData = {
      ...notification,
      read: false,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Get notifications for a user
export const getUserNotifications = async (userId: string, limitCount: number = 50) => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    })) as Notification[];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (userId: string) => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};

// Helper functions to create specific notification types
export const notificationHelpers = {
  // Issue update notification
  issueUpdate: async (userId: string, issueTitle: string, status: string, issueId?: string) => {
    return createNotification({
      userId,
      type: 'issue_update',
      title: 'Issue Updated',
      message: `Issue "${issueTitle}" status changed to ${status}`,
      link: issueId ? `/issues/${issueId}` : '/',
      metadata: { issueId, status },
    });
  },

  // Payment reminder
  paymentReminder: async (userId: string, amount: number, dueDate: string, paymentId?: string) => {
    return createNotification({
      userId,
      type: 'payment_reminder',
      title: 'Payment Reminder',
      message: `Payment of ₹${amount} is due on ${dueDate}`,
      link: paymentId ? `/payments/${paymentId}` : '/payments',
      metadata: { amount, dueDate, paymentId },
    });
  },

  // Maintenance alert
  maintenanceAlert: async (userId: string, propertyAddress: string, maintenanceDate: string) => {
    return createNotification({
      userId,
      type: 'maintenance_alert',
      title: 'Maintenance Scheduled',
      message: `Maintenance scheduled for ${propertyAddress} on ${maintenanceDate}`,
      link: '/',
      metadata: { propertyAddress, maintenanceDate },
    });
  },

  // New message
  newMessage: async (userId: string, senderName: string, messagePreview: string, chatId?: string) => {
    return createNotification({
      userId,
      type: 'new_message',
      title: 'New Message',
      message: `${senderName}: ${messagePreview}`,
      link: chatId ? `/chatbot?chat=${chatId}` : '/chatbot',
      metadata: { senderName, chatId },
    });
  },

  // Property added
  propertyAdded: async (userId: string, propertyAddress: string, propertyId?: string) => {
    return createNotification({
      userId,
      type: 'property_added',
      title: 'Property Added',
      message: `New property "${propertyAddress}" has been added to your portfolio`,
      link: propertyId ? `/properties/${propertyId}` : '/',
      metadata: { propertyAddress, propertyId },
    });
  },

  // Resident added
  residentAdded: async (userId: string, residentName: string, unit: string, residentId?: string) => {
    return createNotification({
      userId,
      type: 'resident_added',
      title: 'Resident Added',
      message: `${residentName} has been added to ${unit}`,
      link: residentId ? `/residents/${residentId}` : '/residents',
      metadata: { residentName, unit, residentId },
    });
  },
};





