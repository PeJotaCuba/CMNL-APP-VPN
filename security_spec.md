# Security Spec - RCM Agenda App

## Data Invariants
1. A user profile must have a valid role and email.
2. Only authorized users (Admin, Coordinators, Specialists) can update editorial content.
3. Generated agendas are immutable once created (except for deletion by admin or author).
4. PII like email and mobile should be protected.

## The "Dirty Dozen" Payloads (Examples)
1. **Identity Spoofing**: Attempt to create a user with a different UID.
2. **Role Escalation**: Attempt to set `role: 'admin'` on own profile.
3. **Invalid ID**: Injecting long junk strings as `userId`.
4. **State Shortcutting**: Updating `createdAt` on an existing agenda.
5. **Ghost Fields**: Adding `isVerified: true` to a user profile.
6. **Unauthorized Write**: A 'listener' trying to update `editorial_contents`.
7. **Size Attack**: Sending a 2MB string for the `theme` field.
8. **PII Leak**: Non-auth users reading the `users` collection.
9. **Orphaned Write**: Creating an agenda without a valid `authorId`.
10. **Timestamp Fraud**: Sending a future `updatedAt` instead of `request.time`.
11. **Massive List**: Querying `users` without a limit.
12. **Shadow Field**: Adding a `bonus` field to `ConsolidatedPayment`.

## Firestore Rules Logic (Drafting)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }

    function isSignedIn() { return request.auth != null; }
    function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$'); }
    function incoming() { return request.resource.data; }
    function existing() { return resource.data; }
    
    // Check if user is staff (admin, worker, coordinator)
    function isStaff() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'worker', 'coordinator'];
    }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && userId == request.auth.uid && isValidUser(incoming());
      allow update: if isSignedIn() && (
        (userId == request.auth.uid && incoming().diff(existing()).affectedKeys().hasOnly(['avatar', 'mobile', 'habitualPrograms'])) ||
        (isStaff() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin')
      );
    }

    // ... more rules
  }
}
```
