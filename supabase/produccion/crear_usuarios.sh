#!/bin/bash
# ============================================================
# CREAR USUARIOS EN PRODUCCIÓN — NUEVO CLIENTE
# Requiere: SERVICE_ROLE_KEY y PROJECT_URL del proyecto Supabase
# ============================================================

# Completar estos valores con los del proyecto del cliente:
PROJECT_URL="https://TU_REF.supabase.co"
SERVICE_KEY="TU_SERVICE_ROLE_KEY"

# ── 1. SUPERADMIN (tú — GuambraWeb) ────────────────────────
# Cambia el email/cédula y contraseña por los del cliente real.
curl -s -X POST "$PROJECT_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "0604511089@tiendademo.local",
    "password": "TU_CONTRASENA_SUPERADMIN",
    "email_confirm": true,
    "user_metadata": { "rol": "superadmin", "nombre": "GuambraWeb" }
  }' | jq '.id, .email'

# ── 2. ADMIN (el cliente) ───────────────────────────────────
curl -s -X POST "$PROJECT_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cliente.com",
    "password": "contrasena_del_cliente",
    "email_confirm": true,
    "user_metadata": { "rol": "admin", "nombre": "Administrador" }
  }' | jq '.id, .email'

# ── 3. USUARIO DEMO (para Vercel demo) ─────────────────────
curl -s -X POST "$PROJECT_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@tiendademo.local",
    "password": "demo123",
    "email_confirm": true,
    "user_metadata": { "rol": "admin" }
  }' | jq '.id, .email'

echo "Usuarios creados. El trigger creará automáticamente las filas en perfiles."
