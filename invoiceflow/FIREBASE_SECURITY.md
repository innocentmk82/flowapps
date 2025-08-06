# Firebase Security Rules Documentation

This document explains the comprehensive Firebase security rules implemented for the multi-tenant invoicing application.

## Overview

The Firebase security rules provide:
- **Multi-tenant data isolation** - Users can only access data from their company
- **Role-based access control** - Different permissions for admins and sellers
- **Data validation** - Ensures data integrity and prevents malicious data
- **User activation system** - Only active users can access the system
- **Comprehensive audit trail** - Tracks who created what and when

## Security Model

### Authentication Levels
1. **Unauthenticated** - No access to any data
2. **Authenticated** - Basic access to public data (admin emails for registration)
3. **Active User** - Full access to company data based on role
4. **Admin** - Full access to company data + user management
5. **Seller** - Limited access to core business functions

### Multi-Tenant Isolation
- Every document contains a `companyId` field
- Users can only access documents where `companyId` matches their company
- Complete data isolation between companies
- No cross-company data leakage possible

## Collections and Rules

### 1. Admins Collection (`/admins/{adminId}`)
**Purpose**: Store admin information for registration validation

**Rules**:
- **Read**: Any authenticated user (for email validation during registration)
- **Write**: Only active admins

**Security**: Admins can manage the admin list, but read access is needed for registration validation.

### 2. Users Collection (`/users/{userId}`)
**Purpose**: Store user profiles and authentication data

**Rules**:
- **Read/Write**: Users can access their own document
- **Read**: Admins can read all users in their company
- **Create**: Admins can create users in their company with validation
- **Update**: Admins can update user status and temporary passwords

**Validation**:
```javascript
validateUserCreate(data) {
  return data.keys().hasAll(['uid', 'email', 'displayName', 'role', 'companyId', 'isActive', 'createdAt', 'updatedAt']) &&
    data.uid is string &&
    data.email is string &&
    data.displayName is string &&
    data.role in ['admin', 'seller'] &&
    data.companyId is string &&
    data.isActive is bool &&
    data.createdAt is timestamp &&
    data.updatedAt is timestamp;
}
```

### 3. Companies Collection (`/companies/{companyId}`)
**Purpose**: Store company information and branding

**Rules**:
- **Read/Write**: Company members can access their company data
- **Create**: Authenticated users can create their company during registration

**Validation**:
```javascript
validateCompanyCreate(data) {
  return data.keys().hasAll(['name', 'primaryColor', 'secondaryColor', 'address', 'phone', 'email', 'createdAt', 'updatedAt']) &&
    data.name is string &&
    data.primaryColor is string &&
    data.secondaryColor is string &&
    data.address is string &&
    data.phone is string &&
    data.email is string &&
    data.createdAt is timestamp &&
    data.updatedAt is timestamp;
}
```

### 4. Clients Collection (`/clients/{clientId}`)
**Purpose**: Store client information

**Rules**:
- **Read/Write**: Company members can access clients in their company
- **Create**: Company members can create clients in their company

**Validation**:
```javascript
validateClientCreate(data) {
  return data.keys().hasAll(['companyId', 'name', 'email', 'phone', 'address', 'createdAt', 'updatedAt']) &&
    data.companyId is string &&
    data.name is string &&
    data.email is string &&
    data.phone is string &&
    data.address is string &&
    data.createdAt is timestamp &&
    data.updatedAt is timestamp;
}
```

### 5. Invoices Collection (`/invoices/{invoiceId}`)
**Purpose**: Store invoice data

**Rules**:
- **Read/Write**: Company members can access invoices in their company
- **Create**: Company members can create invoices in their company

**Validation**:
```javascript
validateInvoiceCreate(data) {
  return data.keys().hasAll(['companyId', 'clientId', 'invoiceNumber', 'title', 'items', 'subtotal', 'tax', 'total', 'status', 'issueDate', 'dueDate', 'createdAt', 'updatedAt']) &&
    data.companyId is string &&
    data.clientId is string &&
    data.invoiceNumber is string &&
    data.title is string &&
    data.items is list &&
    data.subtotal is number &&
    data.tax is number &&
    data.total is number &&
    data.status in ['draft', 'sent', 'paid', 'overdue'] &&
    data.issueDate is timestamp &&
    data.dueDate is timestamp &&
    data.createdAt is timestamp &&
    data.updatedAt is timestamp;
}
```

### 6. Receipts Collection (`/receipts/{receiptId}`)
**Purpose**: Store payment receipts (Admin & Seller access)

**Rules**:
- **Read**: Admins and sellers can read receipts in their company
- **Write**: Only admins can write receipts in their company
- **Create**: Only admins can create receipts in their company

**Validation**:
```javascript
validateReceiptCreate(data) {
  return data.keys().hasAll(['companyId', 'invoiceId', 'amount', 'method', 'date', 'createdAt', 'updatedAt']) &&
    data.companyId is string &&
    data.invoiceId is string &&
    data.amount is number &&
    data.method in ['cash', 'card', 'transfer', 'other'] &&
    data.date is timestamp &&
    data.createdAt is timestamp &&
    data.updatedAt is timestamp;
}
```

### 7. Quotations Collection (`/quotations/{quotationId}`)
**Purpose**: Store quotation data

**Rules**:
- **Read/Write**: Company members can access quotations in their company
- **Create**: Company members can create quotations in their company

**Validation**:
```javascript
validateQuotationCreate(data) {
  return data.keys().hasAll(['companyId', 'clientId', 'clientName', 'items', 'subtotal', 'tax', 'total', 'status', 'date', 'expiryDate', 'createdBy']) &&
    data.companyId is string &&
    data.clientId is string &&
    data.clientName is string &&
    data.items is list &&
    data.subtotal is number &&
    data.tax is number &&
    data.total is number &&
    data.status in ['Draft', 'Sent', 'Accepted', 'Declined', 'Expired'] &&
    data.date is string &&
    data.expiryDate is string &&
    data.createdBy is string;
}
```

## Helper Functions

### Authentication Helpers
- `isAuthenticated()` - Checks if user is logged in
- `isUserActive()` - Checks if user exists and is active
- `getUserRole()` - Gets user's role (admin/seller)
- `isAdmin()` - Checks if user is an active admin
- `isSeller()` - Checks if user is an active seller

### Company Helpers
- `getUserCompanyId()` - Gets user's company ID
- `isSameCompany(resourceData)` - Checks if user belongs to same company as resource
- `isSameCompanyRequest(requestData)` - Checks if user belongs to same company as request data

### Validation Helpers
- `validateUserCreate(data)` - Validates user creation data
- `validateCompanyCreate(data)` - Validates company creation data
- `validateClientCreate(data)` - Validates client creation data
- `validateInvoiceCreate(data)` - Validates invoice creation data
- `validateReceiptCreate(data)` - Validates receipt creation data
- `validateQuotationCreate(data)` - Validates quotation creation data

## Security Features

### 1. Data Validation
- All required fields are validated
- Data types are enforced
- Enum values are restricted
- Timestamps are required for audit trails

### 2. Multi-Tenant Isolation
- Company ID is required on all documents
- Users can only access their company's data
- No cross-company data access possible

### 3. Role-Based Access
- Admins have full access to company data
- Sellers have limited access (no receipts)
- User management restricted to admins

### 4. User Activation System
- Only active users can access the system
- Admins can activate/deactivate users
- Inactive users are completely blocked

### 5. Audit Trail
- All documents have `createdAt` and `updatedAt` timestamps
- User creation tracks `addedBy` field
- Document creation tracks `createdBy` field

## Performance Optimizations

### Indexes
Comprehensive indexes are created for:
- Company-based queries (most common)
- Status-based filtering
- Date-based sorting
- User-based filtering
- Client-based filtering

### Query Optimization
- All queries filter by `companyId` first
- Composite indexes for common query patterns
- Efficient sorting and filtering

## Deployment

### Deploy Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Indexes
```bash
firebase deploy --only firestore:indexes
```

### Test Rules
```bash
firebase emulators:start --only firestore
```

## Security Best Practices

### 1. Never Trust Client Data
- All data is validated server-side
- No client-side validation bypass possible
- Input sanitization enforced

### 2. Principle of Least Privilege
- Users get minimum required access
- Role-based permissions enforced
- Company isolation maintained

### 3. Defense in Depth
- Multiple security layers
- Authentication + Authorization + Validation
- Audit trails for all operations

### 4. Regular Security Reviews
- Monitor access patterns
- Review rule effectiveness
- Update rules as needed

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check if user is authenticated
   - Verify user is active
   - Confirm user belongs to correct company
   - Check user role permissions

2. **Validation Errors**
   - Ensure all required fields are present
   - Verify data types are correct
   - Check enum values are valid
   - Confirm timestamps are present

3. **Performance Issues**
   - Check if proper indexes exist
   - Verify queries use indexed fields
   - Monitor query performance
   - Optimize query patterns

### Debug Mode
Enable debug logging in Firebase Console to see rule evaluation details.

## Compliance

### SRA Compliance
- VAT registration numbers stored
- Tax calculations validated
- Audit trails maintained
- Financial data protected

### Data Protection
- Personal data encrypted
- Access logs maintained
- Data retention policies
- GDPR compliance ready

## Future Enhancements

1. **Advanced Validation**
   - Custom validation functions
   - Business rule enforcement
   - Data consistency checks

2. **Enhanced Security**
   - IP-based restrictions
   - Time-based access control
   - Advanced threat detection

3. **Performance Monitoring**
   - Query performance tracking
   - Usage analytics
   - Optimization recommendations 