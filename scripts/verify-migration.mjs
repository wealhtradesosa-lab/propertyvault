#!/usr/bin/env node
/**
 * District 225 — Data Migration Verifier
 * 
 * Compares old top-level Firestore collections (from standalone District app)
 * with OwnerDesk property subcollections to find missing data.
 * 
 * Usage: node scripts/verify-migration.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBVH1KybbkL01qiGu_60fwXP_dYsY9YsuQ",
  authDomain: "district-42394.firebaseapp.com",
  projectId: "district-42394",
  storageBucket: "district-42394.firebasestorage.app",
  messagingSenderId: "579263399308",
  appId: "1:579263399308:web:72c152a5c4779c936042a9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Santiago's credentials
const EMAIL = 'santiagososa1@me.com';
const PASSWORD = process.argv[2];

if (!PASSWORD) {
  console.log('Usage: node scripts/verify-migration.mjs YOUR_PASSWORD');
  console.log('  Uses your OwnerDesk login password to authenticate with Firebase.');
  process.exit(1);
}

async function run() {
  // Authenticate
  console.log('🔐 Authenticating...');
  try {
    await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
    console.log('✅ Authenticated as', EMAIL);
  } catch (e) {
    console.log('❌ Auth failed:', e.message);
    process.exit(1);
  }

  // ═══ READ OLD TOP-LEVEL COLLECTIONS ═══
  console.log('\n📂 Reading OLD District 225 data (top-level collections)...');
  
  const oldExpenses = [];
  const oldIncome = [];
  const oldContributions = [];

  try {
    const expSnap = await getDocs(collection(db, 'expenses'));
    expSnap.forEach(doc => oldExpenses.push({ id: doc.id, ...doc.data() }));
    console.log(`  expenses: ${oldExpenses.length} records`);
  } catch (e) { console.log('  expenses: ERROR -', e.message); }

  try {
    const incSnap = await getDocs(collection(db, 'income'));
    incSnap.forEach(doc => oldIncome.push({ id: doc.id, ...doc.data() }));
    console.log(`  income: ${incSnap.size} records`);
  } catch (e) { console.log('  income: ERROR -', e.message); }

  try {
    const contSnap = await getDocs(collection(db, 'contributions'));
    contSnap.forEach(doc => oldContributions.push({ id: doc.id, ...doc.data() }));
    console.log(`  contributions: ${contSnap.size} records`);
  } catch (e) { console.log('  contributions: ERROR -', e.message); }

  // ═══ READ OWNERDESK PROPERTY DATA ═══
  console.log('\n📂 Reading OwnerDesk properties...');
  const propsSnap = await getDocs(collection(db, 'properties'));
  const properties = [];
  propsSnap.forEach(doc => properties.push({ id: doc.id, ...doc.data() }));
  
  console.log(`  Found ${properties.length} properties:`);
  properties.forEach(p => console.log(`    - ${p.name || 'Sin nombre'} (${p.id}) — ${p.city || ''}`));

  // Find District 225
  const district = properties.find(p => 
    (p.name || '').toLowerCase().includes('district') || 
    (p.address || '').toLowerCase().includes('district')
  );

  if (!district) {
    console.log('\n⚠️ No property named "District" found in OwnerDesk.');
    console.log('   Old data exists but no property to migrate to.');
    process.exit(0);
  }

  console.log(`\n🏢 District 225 found: ${district.id}`);

  // Read OwnerDesk subcollections for District
  const newExpenses = [];
  const newIncome = [];
  const newContributions = [];
  const newStatements = [];

  try {
    const snap = await getDocs(collection(db, 'properties', district.id, 'expenses'));
    snap.forEach(doc => newExpenses.push({ id: doc.id, ...doc.data() }));
  } catch (e) {}

  try {
    const snap = await getDocs(collection(db, 'properties', district.id, 'income'));
    snap.forEach(doc => newIncome.push({ id: doc.id, ...doc.data() }));
  } catch (e) {}

  try {
    const snap = await getDocs(collection(db, 'properties', district.id, 'contributions'));
    snap.forEach(doc => newContributions.push({ id: doc.id, ...doc.data() }));
  } catch (e) {}

  try {
    const snap = await getDocs(collection(db, 'properties', district.id, 'statements'));
    snap.forEach(doc => newStatements.push({ id: doc.id, ...doc.data() }));
  } catch (e) {}

  // ═══ COMPARE ═══
  console.log('\n════════════════════════════════════');
  console.log('   COMPARISON: OLD vs OWNERDESK');
  console.log('════════════════════════════════════');
  
  console.log(`\n  EXPENSES:`);
  console.log(`    Old District:  ${oldExpenses.length} records`);
  console.log(`    OwnerDesk:     ${newExpenses.length} records`);
  console.log(`    Missing:       ${Math.max(0, oldExpenses.length - newExpenses.length)} records`);

  console.log(`\n  INCOME:`);
  console.log(`    Old District:  ${oldIncome.length} records`);
  console.log(`    OwnerDesk:     ${newIncome.length} records`);
  console.log(`    Missing:       ${Math.max(0, oldIncome.length - newIncome.length)} records`);

  console.log(`\n  CONTRIBUTIONS:`);
  console.log(`    Old District:  ${oldContributions.length} records`);
  console.log(`    OwnerDesk:     ${newContributions.length} records`);
  console.log(`    Missing:       ${Math.max(0, oldContributions.length - newContributions.length)} records`);

  console.log(`\n  STATEMENTS:    ${newStatements.length} records (new in OwnerDesk)`);

  // ═══ DETAILED OLD DATA ═══
  if (oldExpenses.length > 0) {
    console.log('\n── OLD EXPENSES (full list) ──');
    const totalBySocio = {};
    oldExpenses.sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(e => {
      const who = e.paidBy || e.socio || 'unknown';
      totalBySocio[who] = (totalBySocio[who] || 0) + (e.amount || 0);
      console.log(`  ${e.date || '?'} | $${(e.amount || 0).toLocaleString()} | ${who} | ${e.concept || e.category || '?'}`);
    });
    console.log('  ────────────────────');
    Object.entries(totalBySocio).forEach(([who, total]) => {
      console.log(`  ${who}: $${total.toLocaleString()}`);
    });
  }

  if (oldContributions.length > 0) {
    console.log('\n── OLD CONTRIBUTIONS (full list) ──');
    const totalBySocio = {};
    oldContributions.sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(c => {
      const who = c.paidBy || c.socio || 'unknown';
      totalBySocio[who] = (totalBySocio[who] || 0) + (c.amount || 0);
      console.log(`  ${c.date || '?'} | $${(c.amount || 0).toLocaleString()} | ${who} | ${c.concept || '?'}`);
    });
    console.log('  ────────────────────');
    Object.entries(totalBySocio).forEach(([who, total]) => {
      console.log(`  ${who}: $${total.toLocaleString()}`);
    });
  }

  if (oldIncome.length > 0) {
    console.log('\n── OLD INCOME (full list) ──');
    let totalGross = 0, totalNet = 0;
    oldIncome.sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(i => {
      const gross = i.grossAmount || i.amount || 0;
      const net = i.netAmount || gross * 0.85;
      totalGross += gross;
      totalNet += net;
      console.log(`  ${i.date || '?'} | Gross: $${gross.toLocaleString()} | Net: $${net.toLocaleString()} | ${i.concept || i.source || '?'}`);
    });
    console.log(`  ────────────────────`);
    console.log(`  Total Gross: $${totalGross.toLocaleString()} | Total Net: $${totalNet.toLocaleString()}`);
  }

  // ═══ BALANCE CALCULATION (OLD DATA) ═══
  console.log('\n════════════════════════════════════');
  console.log('   BALANCE CALCULATION (OLD DATA)');
  console.log('════════════════════════════════════');

  const santiagoExp = oldExpenses.filter(e => (e.paidBy || e.socio || '') === 'santiago').reduce((s, e) => s + (e.amount || 0), 0);
  const camiloExp = oldExpenses.filter(e => (e.paidBy || e.socio || '') === 'camilo').reduce((s, e) => s + (e.amount || 0), 0);
  const santiagoContrib = oldContributions.filter(c => (c.paidBy || c.socio || '') === 'santiago').reduce((s, c) => s + (c.amount || 0), 0);
  const camiloContrib = oldContributions.filter(c => (c.paidBy || c.socio || '') === 'camilo').reduce((s, c) => s + (c.amount || 0), 0);

  const santiagoTotal = santiagoContrib + santiagoExp;
  const camiloTotal = camiloContrib + camiloExp;
  const diff = santiagoTotal - camiloTotal;

  console.log(`  Santiago: Contributions $${santiagoContrib.toLocaleString()} + Expenses $${santiagoExp.toLocaleString()} = $${santiagoTotal.toLocaleString()}`);
  console.log(`  Camilo:   Contributions $${camiloContrib.toLocaleString()} + Expenses $${camiloExp.toLocaleString()} = $${camiloTotal.toLocaleString()}`);
  console.log(`  Difference: $${Math.abs(diff).toLocaleString()}`);
  console.log(`  ${diff > 0 ? 'Camilo debe a Santiago' : 'Santiago debe a Camilo'}: $${(Math.abs(diff) / 2).toLocaleString()}`);

  // ═══ MIGRATION OPTION ═══
  if (oldExpenses.length > newExpenses.length || oldContributions.length > newContributions.length) {
    console.log('\n⚠️  HAY DATOS FALTANTES EN OWNERDESK');
    console.log('   Para migrar, ejecuta:');
    console.log('   node scripts/verify-migration.mjs YOUR_PASSWORD --migrate');
    
    if (process.argv[3] === '--migrate') {
      console.log('\n🔄 MIGRANDO datos faltantes...');
      
      // Migrate expenses
      let migrated = 0;
      for (const e of oldExpenses) {
        // Check if already exists (by date + amount + concept)
        const exists = newExpenses.find(n => 
          n.date === e.date && 
          Math.abs((n.amount || 0) - (e.amount || 0)) < 1 &&
          (n.concept || '') === (e.concept || '')
        );
        if (!exists) {
          const { id, ...data } = e;
          await addDoc(collection(db, 'properties', district.id, 'expenses'), {
            ...data,
            migratedFrom: 'district225-legacy',
            createdAt: serverTimestamp()
          });
          migrated++;
          console.log(`  ✅ Expense: ${e.date} $${e.amount} ${e.concept || ''}`);
        }
      }
      console.log(`  Expenses migrated: ${migrated}`);

      // Migrate contributions
      migrated = 0;
      for (const c of oldContributions) {
        const exists = newContributions.find(n =>
          n.date === c.date &&
          Math.abs((n.amount || 0) - (c.amount || 0)) < 1
        );
        if (!exists) {
          const { id, ...data } = c;
          await addDoc(collection(db, 'properties', district.id, 'contributions'), {
            ...data,
            migratedFrom: 'district225-legacy',
            createdAt: serverTimestamp()
          });
          migrated++;
          console.log(`  ✅ Contribution: ${c.date} $${c.amount} ${c.paidBy || c.socio}`);
        }
      }
      console.log(`  Contributions migrated: ${migrated}`);

      console.log('\n✅ MIGRACIÓN COMPLETA');
    }
  } else {
    console.log('\n✅ Los datos parecen estar completos en OwnerDesk.');
  }

  process.exit(0);
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
