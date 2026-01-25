<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1dDhHsTJBZlckQYw3dYSH6DrlnzitAzL7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Deploy Supabase Edge Functions:
   `supabase secrets set GEMINI_API_KEY=your_key_here`
   `npm run dev`

---

# Manual Verification Checklist v1.0
Usa esta lista antes de dar por cerrada cualquier versión nueva.

### 1. Flujo Crítico de Transacciones
- [ ] **Crear Ingreso:** Añadir transacción de 'Ingreso' en cuenta Bancaria. Verificar que el saldo de la cuenta sube exactamente esa cantidad.
- [ ] **Crear Gasto:** Añadir gasto en Tarjeta de Crédito (debe aumentar la deuda/reducir saldo negativo).
- [ ] **Editar Cuenta:** Mover transacción de Cuenta A -> Cuenta B editándola. Verificar saldos de AMBAS cuentas.
- [ ] **Borrar:** Eliminar una transacción y confirmar reversión de saldo.

### 2. Integridad de Datos (Reports)
- [ ] **Snapshot vs Live:** Generar reporte del mes actual. Comparar "Net Worth" del reporte con el "Net Worth" del Dashboard. Deben ser idénticos.
- [ ] **Filtro Fechas:** Crear reporte "Custom" del día 1 al 5. Confirmar que NO salen transacciones del día 6.
- [ ] **PDF:** Descargar PDF y verificar que los números coinciden con la pantalla.

### 3. Configure Supabase Edge Functions (AI Proxy)

Security Note: We do NOT use client-side API keys. The Gemini API Key is stored securely in Supabase.

Run this command once to configure your production secret:

```bash
npx supabase secrets set GEMINI_API_KEY=your_actual_api_key_here
```

To deploy updates to the proxy function:
```bash
npx supabase functions deploy gemini-proxy --no-verify-jwt
```

### 4. Resiliencia
- [ ] **Offline (Simulado):** Desconectar internet. Intentar navegar. La app no debe crashear (puede mostrar "Reconectando...").
- [ ] **Input Malicioso:** Intentar poner letras en campos de "Monto". Debe bloquearse o sanitizarse.

### 5. Configuración
- [ ] **Cambio Moneda:** Cambiar moneda base a EUR. Verificar que el Dashboard actualiza los símbolos y hace la conversión (según tasas estáticas).
- [ ] **Idioma:** Cambiar a Español. Verificar Menú Principal y Botones de Acción.
