from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Alert
from .serializers import AlertSerializer


@receiver(post_save, sender=Alert)
def alert_saved(sender, instance, created, **kwargs):
    """Send WebSocket notification when alert is created or updated"""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            alert_serializer = AlertSerializer(instance)
            action = 'created' if created else 'updated'
            
            async_to_sync(channel_layer.group_send)(
                'alerts',
                {
                    'type': 'alert_message',
                    'message': f'Alert {action}',
                    'alert_data': {
                        'action': action,
                        'alert': alert_serializer.data,
                    }
                }
            )
            print(f"WebSocket notification sent for alert {instance.id} ({action})")
    except Exception as e:
        print(f"Error sending WebSocket message for alert: {e}")


@receiver(post_delete, sender=Alert)
def alert_deleted(sender, instance, **kwargs):
    """Send WebSocket notification when alert is deleted"""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'alerts',
                {
                    'type': 'alert_message',
                    'message': 'Alert deleted',
                    'alert_data': {
                        'action': 'deleted',
                        'alert': {'id': instance.id},
                    }
                }
            )
    except Exception as e:
        print(f"Error sending WebSocket message for deleted alert: {e}")

