# Regras de Segurança do Firebase - Sistema de Presença

## 🔒 Regras do Realtime Database

Aplique estas regras no Firebase Console > Realtime Database > Rules:

```json
{
  "rules": {
    "status": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        "$conn": {
          ".write": "auth != null && auth.uid == $uid"
        }
      }
    },
    ".read": false,
    ".write": false
  }
}
```

## 🔒 Regras do Firestore

Aplique estas regras no Firebase Console > Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Posts - leitura pública, escrita apenas do autor
    match /Posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid == resource.data.authorId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.authorId;
    }
    
    // Users - leitura pública, escrita apenas do próprio usuário
    match /Users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Organizations - leitura pública, escrita apenas de membros autorizados
    match /organizations/{orgId} {
      allow read: if true;
      allow write: if request.auth != null && 
        (request.auth.uid == resource.data.ownerId || 
         exists(/databases/$(database)/documents/organizations/$(orgId)/memberships/$(request.auth.uid)));
    }
    
    // Memberships - leitura para membros da organização, escrita para admins
    match /organizations/{orgId}/memberships/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         exists(/databases/$(database)/documents/organizations/$(orgId)/memberships/$(request.auth.uid)));
      allow write: if request.auth != null && 
        (request.auth.uid == resource.data.ownerId || 
         exists(/databases/$(database)/documents/organizations/$(orgId)/memberships/$(request.auth.uid)));
    }
    
    // Events - leitura pública, escrita apenas de organizações
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/organizations/$(resource.data.hostOrgId)/memberships/$(request.auth.uid));
    }
    
    // Event Registrations - leitura para organizações, escrita para membros
    match /eventRegistrations/{registrationId} {
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/organizations/$(resource.data.orgId)/memberships/$(request.auth.uid));
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/organizations/$(resource.data.orgId)/memberships/$(request.auth.uid));
    }
    
    // Log Mercado (Atividades Recentes) - leitura pública, escrita autenticada
    match /logMercado/{logId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 🚨 Solução de Problemas

### Erro: "Missing or insufficient permissions"

1. **Verifique se as regras foram aplicadas:**
   - Acesse Firebase Console
   - Vá para Firestore > Rules
   - Cole as regras acima
   - Clique em "Publish"

2. **Verifique se o usuário está autenticado:**
   ```javascript
   // No console do navegador
   console.log(firebase.auth().currentUser);
   ```

3. **Teste as regras:**
   - Use o Firebase Rules Simulator
   - Teste com diferentes cenários de usuário

### Erro: "Permission denied" no RTDB

1. **Verifique as regras do RTDB:**
   - Acesse Firebase Console
   - Vá para Realtime Database > Rules
   - Cole as regras do RTDB acima

2. **Verifique se o usuário tem acesso ao próprio nó:**
   ```javascript
   // O usuário só pode acessar /status/{seu_uid}
   ```

## 🔧 Configuração Adicional

### Variáveis de Ambiente

Certifique-se de que estas variáveis estão configuradas:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Teste de Conectividade

```javascript
// Teste se o Firebase está funcionando
import { auth, db } from './firebase';

// Verificar autenticação
console.log('Usuário logado:', auth.currentUser);

// Testar leitura do Firestore
import { doc, getDoc } from 'firebase/firestore';
const testDoc = doc(db, 'Users', 'test');
getDoc(testDoc).then(doc => console.log('Teste Firestore:', doc.exists()));
```

## 📝 Notas Importantes

1. **As regras são aplicadas imediatamente** após publicação
2. **Teste sempre em ambiente de desenvolvimento** antes de produção
3. **Monitore os logs** do Firebase para identificar problemas
4. **Use o Firebase Rules Simulator** para testar cenários complexos
