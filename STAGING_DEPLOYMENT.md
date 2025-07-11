# Staging Deployment Instructions

## Branch: feature/user-management-enhancements

### What's New
- **User Edit Functionality**: Fixed the bug where editing users in the admin panel would fail
- **Self Password Change**: Users can now change their own passwords from the dropdown menu in the header
- **Enhanced User Management**: Better UI with dropdown menu showing user profile
- **Comprehensive Tests**: Added 45+ unit tests for both frontend and backend

### Deployment Steps

1. **SSH into the staging server**:
   ```bash
   ssh root@93.127.194.202
   ```

2. **Navigate to the application directory**:
   ```bash
   cd /opt/carcollection
   ```

3. **Stop the services**:
   ```bash
   systemctl stop carcollection-frontend carcollection-backend
   ```

4. **Backup the database**:
   ```bash
   cp backend/car_collection.db backend/car_collection.db.backup.$(date +%Y%m%d-%H%M%S)
   ```

5. **Fetch and checkout the feature branch**:
   ```bash
   git fetch origin
   git checkout feature/user-management-enhancements
   git pull origin feature/user-management-enhancements
   ```

6. **Update backend dependencies**:
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   pip install pydantic-settings==2.1.0
   deactivate
   cd ..
   ```

7. **Build the frontend**:
   ```bash
   cd car-collection-prototype
   npm install
   export NEXT_TELEMETRY_DISABLED=1
   npm run build
   cd ..
   ```

8. **Set proper permissions**:
   ```bash
   chown -R carcollection:carcollection /opt/carcollection
   ```

9. **Start the services**:
   ```bash
   systemctl start carcollection-backend
   sleep 5
   systemctl start carcollection-frontend
   ```

10. **Verify the deployment**:
    ```bash
    systemctl status carcollection-backend
    systemctl status carcollection-frontend
    ```

### Testing the New Features

1. **Test User Edit (Admin)**:
   - Login as Administrator
   - Go to Admin page
   - Click Edit on any user
   - Try changing their details (including disabling/enabling accounts)

2. **Test Password Change**:
   - Click on your username in the header
   - Select "Change Password" from the dropdown
   - Enter current password and new password
   - Verify you can login with the new password

### Rollback Instructions (if needed)

If something goes wrong:

1. Stop services:
   ```bash
   systemctl stop carcollection-frontend carcollection-backend
   ```

2. Restore database:
   ```bash
   cp backend/car_collection.db.backup.<timestamp> backend/car_collection.db
   ```

3. Checkout previous commit:
   ```bash
   git checkout 7e6d59a
   ```

4. Rebuild and restart:
   ```bash
   cd car-collection-prototype
   npm run build
   cd ..
   systemctl start carcollection-backend carcollection-frontend
   ```

### Notes
- The feature branch includes comprehensive test coverage
- All tests are passing locally
- No database migrations required (schema changes are backward compatible)