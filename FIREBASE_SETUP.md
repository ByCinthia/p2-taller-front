# Configuración de Firebase Cloud Messaging en Angular

## Pasos para completar la integración de Firebase:

### 1. Obtener credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto o crea uno nuevo
3. En **Configuración del proyecto** → **Tu app**, copia los datos de configuración
4. La configuración debe verse como:
```javascript
{
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
}
```

### 2. Actualizar `src/environments/environment.ts`

Reemplaza los valores `YOUR_*` con tus credenciales reales:
```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8001',
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_AUTH_DOMAIN',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
};
```

### 3. Obtener VAPID Key

1. En Firebase Console, ve a **Cloud Messaging** → **Web push certificates**
2. Si no tienes un par de claves, haz clic en **Generate Key Pair**
3. Copia la **Public Key** (VAPID Key)
4. Actualiza `src/app/services/push-notification.service.ts`:
```typescript
const token = await getToken(this.messaging, {
  vapidKey: 'YOUR_VAPID_KEY', // Reemplazar con tu VAPID key
});
```

### 4. Actualizar `src/firebase-messaging-sw.js`

Reemplaza los valores de configuración en el service worker con tus credenciales reales:
```javascript
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

### 5. Instalar dependencias (si es necesario)

```bash
cd frontend
npm install
```

### 6. Compilar y ejecutar

```bash
npm run start
```

## Flujo de funcionamiento:

### Al hacer login:
1. El usuario se autentica con `/token/`
2. **Automáticamente** se solicita permiso de notificaciones
3. Se obtiene el **FCM token** de Firebase
4. El token se envía al backend con `PATCH /api/auth/fcm-token`

### Cuando llega una notificación:
1. Si la app está en foreground: se muestra un **toast** con opción "Ver solicitud"
2. Si la app está en background: se muestra una **notificación del sistema**
3. Al hacer clic en el botón o la notificación: navega a `/app/incidentes/{id}`

### Datos esperados de la notificación:
```json
{
  "notification": {
    "title": "Nueva Solicitud de Auxilio",
    "body": "Incidente #123 requiere atención"
  },
  "data": {
    "incidente_id": "123"
  }
}
```

## Verificar que todo está funcionando:

1. **En el navegador**, abre DevTools (F12)
2. En **Application** → **Service Workers**, deberías ver `/firebase-messaging-sw.js` registrado
3. En **Notifications**, verifica que el permiso está otorgado
4. Después de login, en la consola deberías ver:
   - `[PushNotificationService] FCM Token obtained: ...`
   - `[PushNotificationService] FCM token sent to backend successfully`

## Troubleshooting:

### "Service Worker no se registra"
- Verifica que `firebase-messaging-sw.js` esté en la carpeta `src/`
- Revisa que está incluido en `angular.json` bajo assets
- Reconstruye el proyecto: `npm run build`

### "FCM token es null"
- Verifica que tienes la VAPID Key correcta en `push-notification.service.ts`
- Asegúrate que Firebase está inicializado correctamente
- Revisa los permisos en las DevTools

### "Notificaciones no llegan"
- Verifica en el backend que el `fcm_token` se guardó correctamente en la tabla del usuario
- En Firebase Console, usa **Messaging** → **Send test message** para verificar

## Notas importantes:

- ⚠️ **No se modifica** el endpoint `POST /api/auth/token/`
- ⚠️ **No se rompe** ninguna funcionalidad existente
- ✅ El token se solicita **automáticamente** después del login exitoso
- ✅ El toast se muestra con **opción de navegación** al incidente
- ✅ Compatible con **múltiples roles** (cliente, empleado, admin)
