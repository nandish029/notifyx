# integrations/backend/python-flask/push_routes.py
import json
import os
from flask import Blueprint, request, jsonify
from pywebpush import webpush, WebPushException

# 🚀 NotifyX Flask Blueprint
NotifyX_bp = Blueprint('NotifyX', __name__)

# ⚠️ MOCK DATABASE: Replace with SQLAlchemy, PyMongo, etc.
mock_database = []

def save_to_db(sub):
    mock_database.append(sub)

def delete_from_db(endpoint):
    global mock_database
    mock_database = [sub for sub in mock_database if sub.get('endpoint') != endpoint]

def get_all_subscriptions():
    return mock_database

@NotifyX_bp.route('/subscribe', methods=['POST'])
def subscribe():
    subscription = request.get_json()
    
    # Strict validation
    if not subscription or 'endpoint' not in subscription or 'keys' not in subscription:
        return jsonify({'error': '[NotifyX] Invalid subscription payload.'}), 400

    try:
        save_to_db(subscription)
        return jsonify({'message': 'Subscription saved.'}), 201
    except Exception as e:
        print(f"[NotifyX] DB Save Error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@NotifyX_bp.route('/unsubscribe', methods=['DELETE'])
def unsubscribe():
    data = request.get_json()
    endpoint = data.get('endpoint')
    
    if not endpoint:
        return jsonify({'error': '[NotifyX] Endpoint required.'}), 400

    try:
        delete_from_db(endpoint)
        return jsonify({'message': 'Subscription removed.'}), 200
    except Exception as e:
        print(f"[NotifyX] DB Delete Error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@NotifyX_bp.route('/broadcast', methods=['POST'])
def broadcast():
    data = request.get_json()
    
    # NotifyX strict v2.0 payload schema
    payload = json.dumps({
        "title": data.get('title', 'System Update'),
        "body": data.get('body', 'You have a new notification.'),
        "url": data.get('url', '/'),
        "tag": data.get('tag', 'default-tag'),
        "icon": data.get('icon'),
        "image": data.get('image'),
        "requireInteraction": data.get('requireInteraction'),
        "silent": data.get('silent'),
        "vibrate": data.get('vibrate'),
        "renotify": data.get('renotify'),
        "actions": data.get('actions', [])
    })

    vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
    vapid_claims = {"sub": os.getenv('CONTACT_EMAIL')}

    success_count = 0
    fail_count = 0

    for sub in get_all_subscriptions():
        try:
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims=vapid_claims
            )
            success_count += 1
        except WebPushException as ex:
            # EDGE CASE: 410 Gone means the user blocked notifications in their browser settings.
            # We must delete them from the database to prevent future errors.
            if ex.response and ex.response.status_code in [410, 404]:
                print(f"[NotifyX] Subscription expired. Cleaning up DB for: {sub['endpoint']}")
                delete_from_db(sub['endpoint'])
            else:
                print(f"[NotifyX] Push failed: {repr(ex)}")
            fail_count += 1

    return jsonify({
        'message': 'Broadcast complete',
        'stats': {'successful': success_count, 'failed': fail_count}
    }), 200