import { CONSTANTS } from './constants.js';

export class NotificationManager {
    constructor(notificationElement, messageElement) {
        this.notification = notificationElement;
        this.messageElement = messageElement;
    }
    
    show(message) {
        this.messageElement.textContent = message;
        this.notification.classList.add('show');
        setTimeout(() => {
            this.notification.classList.remove('show');
        }, CONSTANTS.NOTIFICATION_DURATION);
    }
}