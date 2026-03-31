# PropertyVault — Administra tu inversión inmobiliaria en EE.UU.

## Stack
- React 18 + Vite
- Firebase Auth + Firestore
- Tailwind CSS
- Recharts
- Netlify (deploy)

## Firebase: district-42394
Mismo proyecto Firebase que District 225. Se agregan colecciones nuevas bajo `properties/`.

### Estructura Firestore
```
properties/{propertyId}
  ├── name, address, city, state, type
  ├── purchasePrice, purchaseDate
  ├── bedrooms, bathrooms
  ├── manager, managerCommission
  ├── partners: [{id, name, ownership, initialCapital, color}]
  ├── mortgage: {balance, rate, termYears, monthlyPayment, startDate}
  ├── ownerId (uid del usuario que creó)
  │
  ├── /expenses/{id}         ← gastos (fecha, concepto, monto, quién pagó, categoría)
  ├── /income/{id}           ← ingresos (bruto, comisión PM, neto)
  ├── /contributions/{id}    ← aportes de capital por socio
  └── /statements/{id}       ← statements mensuales del PM (revenue, desglose gastos, net)
```

### Firestore Rules
Copiar el contenido de `firestore.rules` a Firebase Console > Firestore > Rules.

### Firestore Index requerido
En Firebase Console > Firestore > Indexes, crear:
- Collection: `properties`
- Field: `ownerId` (Ascending)
- Query scope: Collection

## Setup local
```bash
npm install
npm run dev
```

## Deploy a Netlify
```bash
npm run build
# El dist/ se sube a Netlify automáticamente si tienes CI/CD configurado
# O manualmente: netlify deploy --prod --dir=dist
```

## Flujo de usuario
1. Login / Registro (Firebase Auth)
2. Si no tiene propiedad → Onboarding (3 pasos: propiedad, socios, hipoteca)
3. Dashboard principal con sidebar:
   - 📊 Dashboard (KPIs, gráficos, balance socios)
   - 👥 Socios (aportes, gastos, historial)
   - 📋 Statements (cargar mensuales del PM)
   - 🧾 Gastos (por categoría, quién pagó)
   - 💰 Ingresos (bruto, comisión, neto)
   - 🏦 Hipoteca (simulador pagos anticipados)

## Módulos
### Socios & Capital
- N socios dinámicos con % de participación
- Tracking de capital aportado por cada socio
- Balance: quién ha puesto más y quién debe

### Statements
- Carga manual de owner statements del PM
- Desglose: revenue, comisión, electricidad, agua, HOA, maintenance, vendor, net
- Comparativo anual automático

### Hipoteca
- Simulador de pagos anticipados al principal
- Muestra: años que te ahorras, intereses ahorrados, meses menos
- Gráfico de amortización con vs sin pagos extra

### Ingresos
- Ingreso bruto con cálculo automático de comisión del PM
- Split automático entre socios según %

## Evolución futura (v2)
- Multi-propiedad (un usuario puede tener N propiedades)
- Roles (owner, socio viewer, manager)
- Parser automático de PDFs de statements
- Reportes PDF exportables
- Notificaciones por email
- Integración con plataformas de rental (Airbnb API)
