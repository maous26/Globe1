// MongoDB initialization script for Docker
db = db.getSiblingDB('globegenius');

// Create application user
db.createUser({
  user: 'globegenius_app',
  pwd: 'app_password_123',
  roles: [
    {
      role: 'readWrite',
      db: 'globegenius'
    }
  ]
});

// Create collections with indexes
db.createCollection('users');
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "subscriptionType": 1 });
db.users.createIndex({ "isAdmin": 1 });

db.createCollection('routes');
db.routes.createIndex({ "departureAirport.code": 1, "destinationAirport.code": 1 }, { unique: true });
db.routes.createIndex({ "tier": 1, "isActive": 1 });
db.routes.createIndex({ "lastScannedAt": 1, "isActive": 1 });

db.createCollection('alerts');
db.alerts.createIndex({ "user": 1, "createdAt": -1 });
db.alerts.createIndex({ "status": 1 });
db.alerts.createIndex({ "expiryDate": 1 });

db.createCollection('apistats');
db.apistats.createIndex({ "date": -1 });
db.apistats.createIndex({ "provider": 1, "date": -1 });

print('MongoDB initialization completed successfully!'); 