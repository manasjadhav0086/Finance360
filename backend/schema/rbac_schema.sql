-- =====================================================================
-- Finance360 Custom MySQL RBAC Architecture Proposal & Schema Definition
-- Prepared for Stage-2 RBAC Migration (Decoupled from Keycloak / Cloud SSO)
-- =====================================================================

-- 1. Users Table (Aligned with Finance360 existing User model + RBAC extensions)
CREATE TABLE IF NOT EXISTS users (
    _id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(255) NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL DEFAULT '',
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user', -- Legacy fallback column
    business_groups JSON NULL,                          -- Scoped business groups
    businesses JSON NULL,                               -- Scoped business units
    password_hash VARCHAR(255) NULL,                    -- For custom local authentication
    last_login_at DATETIME NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(64) NOT NULL,
    description VARCHAR(255) NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_permissions_name (name),
    INDEX idx_permissions_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. User Roles Mapping Table (Many-to-Many with Audit Metadata)
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    role_id INT NOT NULL,
    assigned_by VARCHAR(64) NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_role (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    INDEX idx_ur_user (user_id),
    INDEX idx_ur_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Role Permissions Mapping Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_role_permission (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    INDEX idx_rp_role (role_id),
    INDEX idx_rp_perm (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Standard Foundation Roles Seed
INSERT IGNORE INTO roles (name, display_name, description, is_system) VALUES
('admin', 'System Administrator', 'Full administrative access across all financial modules and user governance', TRUE),
('user', 'Financial Viewer / Analyst', 'Standard view-only access to scoped financial reporting and dashboard tabs', TRUE);

-- 7. Standard System Permissions Seed
INSERT IGNORE INTO permissions (name, module, description) VALUES
('financials:view', 'financials', 'View normalized P&L, Executive 360, Trend, and DIS statements'),
('financials:export', 'financials', 'Export financial statements to Excel or CSV'),
('analytics:query', 'analytics', 'Query MySQL Financial Intelligence Agent copilot'),
('news:view', 'market_news', 'Access macroeconomic and market intelligence reports'),
('users:manage', 'administration', 'Create, update, and manage user accounts and scopes'),
('settings:manage', 'administration', 'Manage platform settings and global configuration');

-- 8. Map Standard Role Permissions
-- Admin gets all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin';

-- Standard User gets read-only permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'user' AND p.name IN ('financials:view', 'analytics:query', 'news:view');
