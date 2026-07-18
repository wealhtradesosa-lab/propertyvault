const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const detectPlan = (amount) => (amount === 2100 || amount === 19200) ? 'pro' : 'starter';
const detectCycle = (interval) => interval === 'year' ? 'annual' : 'monthly';

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const stripe = require('stripe')(process.env.STRIPE_SECRET);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  const getEmailFromCustomer = async (customerId) => {
    try { const c = await stripe.customers.retrieve(customerId); return (c.email||'').toLowerCase(); }
    catch(e) { return ''; }
  };

  const getSubDetails = async (subId) => {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      const item = sub.items?.data?.[0]?.price;
      return { plan: detectPlan(item?.unit_amount||0), cycle: detectCycle(item?.recurring?.interval||'month'), status: sub.status };
    } catch(e) { return { plan: 'starter', cycle: 'monthly', status: 'active' }; }
  };

  try {
    switch(event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = (session.customer_details?.email || session.customer_email || '').toLowerCase();
        if (!email) break;
        const details = session.subscription ? await getSubDetails(session.subscription) : { plan: 'starter', cycle: 'monthly', status: 'active' };
        await db.collection('users').doc(email).set({
          ...details, email, stripeCustomerId: session.customer || '',
          stripeSubscriptionId: session.subscription || '',
          paidAt: admin.firestore.FieldValue.serverTimestamp(), status: 'active'
        }, { merge: true });
        console.log('checkout.completed:', email, details.plan, details.cycle);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const email = await getEmailFromCustomer(sub.customer);
        if (!email) break;
        const item = sub.items?.data?.[0]?.price;
        const plan = detectPlan(item?.unit_amount||0);
        const cycle = detectCycle(item?.recurring?.interval||'month');
        const status = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : sub.status;
        await db.collection('users').doc(email).set({ plan, cycle, status, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        console.log('subscription.updated:', email, plan, cycle, status);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const email = await getEmailFromCustomer(sub.customer);
        if (email) await db.collection('users').doc(email).set({ plan: 'free', status: 'cancelled', cancelledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        console.log('subscription.deleted:', email);
        break;
      }
      case 'invoice.payment_failed': {
        const email = (event.data.object.customer_email || '').toLowerCase();
        if (email) await db.collection('users').doc(email).set({ status: 'past_due', lastFailedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        console.log('payment.failed:', email);
        break;
      }
      case 'invoice.paid': {
        const email = (event.data.object.customer_email || '').toLowerCase();
        if (email) await db.collection('users').doc(email).set({ status: 'active', lastPaidAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        console.log('invoice.paid:', email);
        break;
      }
    }
  } catch(e) { console.error('Webhook handler error:', e); }

  res.status(200).json({ received: true });
});

// ═══ AI DOCUMENT EXTRACTION (Claude API) ═══
const FIELD_SPECS = {
  escritura: {
    description: 'Escritura pública colombiana (deed)',
    fields: {
      naturalezaActo: 'Naturaleza del acto: COMPRAVENTA, DONACIÓN, HIPOTECA, CONSTITUCIÓN DE PROPIEDAD HORIZONTAL, ENGLOBE, LOTEO, ACLARATORIA, etc.',
      numEscritura: 'Número de la escritura (solo dígitos, ej "698")',
      notaria: 'Notaría y ciudad (ej "26 de Medellín")',
      fechaRegistro: 'Fecha de la escritura (ej "4 de Septiembre de 2012")',
      valorVenta: 'Valor de venta / precio / valor del acto en pesos colombianos. Solo número con separadores. Si dice "valor del acto" o "precio" extraerlo. Si no aparece, vacío.',
      formaPago: 'Forma de pago (contado, financiación, parte contado parte crédito, etc.)',
      matriculaInmobiliaria: 'Número de matrícula inmobiliaria mencionada en la escritura (formato XXX-XXXXXX)',
      area: 'Área total del inmueble en m² (solo número, ej "1690.28")',
      coeficiente: 'Coeficiente de copropiedad en % (solo si es propiedad horizontal / apartamento)',
      linderos: 'Descripción de linderos (norte, sur, oriente, occidente) — texto completo',
      propietarios: 'COMPRADOR(ES) / adquiriente(s) — la persona que ADQUIERE en la escritura. Nombre(s) en mayúsculas como aparece.',
      vendedor: 'VENDEDOR(ES) / otorgante(s) / cedente(s) — la persona que TRANSFIERE. Nombre(s) en mayúsculas.'
    }
  },
  tradicion: {
    description: 'Certificado de Tradición y Libertad (Supernotariado Colombia)',
    fields: {
      matricula: 'Número de matrícula inmobiliaria (formato XXX-XXXXXXX, ej "001-1146138"). NUNCA el Pin No.',
      estadoFolio: 'Estado del folio: "ACTIVO" o "INACTIVO" (literal como aparece)',
      circulo: 'Círculo registral con código y ciudad (ej "001 - MEDELLIN SUR")',
      propietarios: 'Propietario(s) actual(es) — el último "A:" en las anotaciones (el adquiriente más reciente). Nombre completo en mayúsculas.',
      gravamenes: 'Lista resumida de gravámenes/hipotecas/embargos/servidumbres ACTIVOS si existen, sino "Ninguno". Solo los vigentes, no históricos cancelados.',
      estado: 'Resumen del estado: "✅ Libre de gravámenes", "⚠️ Con hipoteca", "⚠️ Con servidumbres", "🚨 Con embargo", etc.',
      numAnotaciones: 'Número total de anotaciones en el certificado (ej "12")',
      direccion: 'Dirección/ubicación del inmueble como aparece en sección "DIRECCION DEL INMUEBLE"',
      areaTotal: 'Área total del inmueble en m² (de la sección CABIDA Y LINDEROS)',
      fechaExpedicion: 'Fecha de impresión/expedición del certificado',
      ultimaTransaccion: 'Fecha de la última anotación / transacción registrada (la más reciente)'
    }
  },
  predial: {
    description: 'Impuesto Predial colombiano',
    fields: {
      avaluoCatastral: 'Avalúo catastral en pesos (solo número con separadores)',
      impuestoAnual: 'Impuesto anual a pagar en pesos',
      vigencia: 'Año fiscal / vigencia (ej "2025")',
      cedulaCatastral: 'Número de cédula catastral / código catastral / matrícula catastral',
      direccion: 'Dirección del predio',
      destino: 'Destino económico (residencial, comercial, lote, etc.)',
      estrato: 'Estrato socioeconómico (1-6)',
      areaTerreno: 'Área del terreno en m²',
      areaConstruida: 'Área construida en m²'
    }
  },
  contrato: {
    description: 'Contrato de arrendamiento',
    fields: {
      inquilino: 'Nombre del inquilino/arrendatario',
      canon: 'Canon mensual de arriendo (solo número)',
      fechaInicio: 'Fecha de inicio del contrato',
      fechaFin: 'Fecha de fin del contrato',
      deposito: 'Depósito de garantía (solo número)'
    }
  },
  poliza: {
    description: 'Póliza de seguro de propiedad',
    fields: {
      aseguradora: 'Nombre de la aseguradora',
      numPoliza: 'Número de póliza',
      tipoCobertura: 'Tipo de cobertura',
      valorAsegurado: 'Valor asegurado',
      prima: 'Prima anual',
      deducible: 'Deducible',
      vigenciaInicio: 'Fecha inicio vigencia',
      vigenciaFin: 'Fecha fin vigencia',
      coberturas: 'Lista de coberturas incluidas (separadas por coma)'
    }
  },
  // ─── US document types ───
  deed: {
    description: 'US Property Deed (Warranty/Grant/Quitclaim)',
    fields: {
      deedType: 'Deed type (Warranty Deed / Grant Deed / Quitclaim Deed / etc.)',
      grantor: 'Grantor (seller/transferor) — full legal name',
      grantee: 'Grantee (buyer/receiver) — full legal name',
      county: 'County where the property is recorded',
      parcelNumber: 'Parcel number / APN (Assessor Parcel Number)',
      recordedDate: 'Date the deed was recorded',
      salePrice: 'Sale price / consideration (numeric, USD)',
      legalDescription: 'Legal description of the property (lot/block, metes & bounds, etc.)'
    }
  },
  titlePolicy: {
    description: 'US Title Insurance Policy',
    fields: {
      titleInsurer: 'Title insurance company name',
      policyNumber: 'Policy number',
      coverageAmount: 'Coverage amount (numeric, USD)',
      effectiveDate: 'Policy effective date',
      exceptions: 'Schedule B exceptions (brief list)'
    }
  },
  propertyTax: {
    description: 'US Property Tax Bill / Assessment',
    fields: {
      parcelNumber: 'Parcel number / APN',
      assessedValue: 'Assessed value (numeric, USD)',
      annualTax: 'Annual tax amount (numeric, USD)',
      taxYear: 'Tax year (e.g. 2025)',
      dueDate: 'Due date',
      county: 'County / tax district'
    }
  },
  closingDisclosure: {
    description: 'US Closing Disclosure or HUD-1 Settlement Statement',
    fields: {
      salePrice: 'Contract sale price (numeric, USD)',
      closingDate: 'Closing/settlement date',
      buyerName: 'Buyer name(s)',
      sellerName: 'Seller name(s)',
      loanAmount: 'Loan amount (numeric, USD)',
      prorationsTaxes: 'Tax prorations (numeric, USD)',
      closingCosts: 'Total closing costs (numeric, USD)'
    }
  },
  hoa: {
    description: 'US HOA Documents (CC&Rs, dues notice, etc.)',
    fields: {
      hoaName: 'HOA name',
      monthlyDues: 'Monthly HOA dues (numeric, USD)',
      specialAssessment: 'Special assessment amount if any (numeric, USD)',
      restrictions: 'Notable restrictions / rules summary',
      contactInfo: 'HOA contact (manager name, phone, email)'
    }
  },
  inspection: {
    description: 'US Home Inspection Report',
    fields: {
      inspector: 'Inspector name and license number',
      inspectionDate: 'Inspection date',
      majorFindings: 'Major issues found (brief bullet list)',
      recommendations: 'Recommendations / required repairs',
      overallCondition: 'Overall condition rating (good/fair/poor)'
    }
  },
  mortgage: {
    description: 'US Mortgage / Deed of Trust',
    fields: {
      lender: 'Lender name',
      loanNumber: 'Loan number',
      loanAmount: 'Original loan amount (numeric, USD)',
      interestRate: 'Interest rate (percentage)',
      termYears: 'Loan term in years',
      firstPaymentDate: 'First payment date'
    }
  },
  lease: {
    description: 'US Lease Agreement',
    fields: {
      tenant: 'Tenant name(s)',
      monthlyRent: 'Monthly rent (numeric, USD)',
      startDate: 'Lease start date',
      endDate: 'Lease end date',
      securityDeposit: 'Security deposit (numeric, USD)'
    }
  },
  insurance: {
    description: 'US Homeowners Insurance Policy',
    fields: {
      insurer: 'Insurance company name',
      policyNumber: 'Policy number',
      dwellingCoverage: 'Dwelling coverage amount (numeric, USD)',
      annualPremium: 'Annual premium (numeric, USD)',
      deductible: 'Deductible (numeric, USD)',
      effectiveDate: 'Policy effective date',
      expirationDate: 'Policy expiration date',
      coverages: 'Coverages included (brief list)'
    }
  },
  survey: {
    description: 'US Property Survey',
    fields: {
      surveyor: 'Surveyor name and license',
      surveyDate: 'Survey date',
      lotArea: 'Lot area (sq ft or acres)',
      boundaries: 'Boundary description',
      easements: 'Easements noted'
    }
  },
  appraisal: {
    description: 'US Appraisal Report',
    fields: {
      appraiser: 'Appraiser name and license',
      appraisalDate: 'Appraisal date',
      appraisedValue: 'Appraised value (numeric, USD)',
      approach: 'Valuation approach (sales comparison / cost / income)',
      comparables: 'Comparable properties summary'
    }
  },
  other: {
    description: 'Other property-related document',
    fields: {
      description: 'Brief description of the document content'
    }
  }
};

exports.extractDocumentFields = functions
  .runWith({ secrets: ['ANTHROPIC_API_KEY'], timeoutSeconds: 60, memory: '512MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Requiere autenticación');
    const { text, docType } = data || {};
    if (!text || typeof text !== 'string') throw new functions.https.HttpsError('invalid-argument', 'Falta el texto del documento');
    if (!FIELD_SPECS[docType]) throw new functions.https.HttpsError('invalid-argument', `Tipo de documento no soportado: ${docType}`);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new functions.https.HttpsError('failed-precondition', 'ANTHROPIC_API_KEY no configurada');

    const spec = FIELD_SPECS[docType];
    const fieldsDescription = Object.entries(spec.fields)
      .map(([k, v]) => `  "${k}": "${v}"`).join(',\n');
    const trimmedText = text.slice(0, 30000); // ~7.5k tokens — well under context

    const prompt = `Extrae datos estructurados del siguiente documento (${spec.description}).

Responde ÚNICAMENTE con un objeto JSON válido con esta forma exacta (sin markdown, sin texto adicional):
{
${fieldsDescription}
}

Reglas:
- Si un campo no aparece en el documento, devuelve string vacío "" (no inventes).
- Para nombres de personas, devuélvelos exactamente como aparecen (mayúsculas si así están).
- Para números, devuélvelos sin símbolos de moneda pero con separadores si los hay.
- Para fechas, formato legible (ej "16 de Junio de 2025").

DOCUMENTO:
"""
${trimmedText}
"""`;

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey });

    try {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });
      const raw = msg.content[0]?.text || '{}';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Respuesta sin JSON');
      const parsed = JSON.parse(jsonMatch[0]);
      const fields = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v === 'string' && v.trim()) fields[k] = v.trim();
        else if (v && typeof v === 'number') fields[k] = String(v);
      }
      return { fields, usage: msg.usage };
    } catch (err) {
      console.error('Claude API error:', err);
      throw new functions.https.HttpsError('internal', `Error de IA: ${err.message}`);
    }
  });
