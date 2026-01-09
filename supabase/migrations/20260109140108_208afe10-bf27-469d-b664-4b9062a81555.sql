-- Criar permissões iniciais para o novo role ecommerce_analyst
INSERT INTO role_permissions (role, permission_key, permission_label, permission_category, enabled)
SELECT 
  'ecommerce_analyst',
  permission_key,
  permission_label,
  permission_category,
  CASE 
    WHEN permission_key IN (
      'dashboard.view',
      'analytics.view',
      'analytics.export',
      'deals.view',
      'contacts.view',
      'contacts.view_organizations'
    ) THEN true
    ELSE false
  END
FROM role_permissions
WHERE role = 'admin'
ON CONFLICT DO NOTHING;