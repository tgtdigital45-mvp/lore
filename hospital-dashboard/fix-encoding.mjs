import fs from 'fs';

function fixFile(filepath) {
  let raw = fs.readFileSync(filepath);
  let s = raw.toString('binary');
  
  // Fix double-encoded UTF-8 sequences caused by PowerShell wrong encoding
  s = s
    .replace(/\xc3\xa2\xe2\x82\xac\xe2\x80\x9d/g, '\xe2\x80\x94') // triple-encoded em-dash
    .replace(/\xc3\xa2\xe2\x82\xac\xc2\xa6/g, '\xe2\x80\xa6')      // ellipsis
    .replace(/\xc3\x83\xc2\xa9/g, '\xc3\xa9') // e with acute
    .replace(/\xc3\x83\xc2\xa3/g, '\xc3\xa3') // a with tilde
    .replace(/\xc3\x83\xc2\xa1/g, '\xc3\xa1') // a with acute
    .replace(/\xc3\x83\xc2\xb3/g, '\xc3\xb3') // o with acute
    .replace(/\xc3\x83\xc2\xad/g, '\xc3\xad') // i with acute
    .replace(/\xc3\x83\xc2\xa0/g, '\xc3\xa0') // a with grave
    .replace(/\xc3\x83\xc2\xa7/g, '\xc3\xa7') // c with cedilla
    .replace(/\xc3\x83\xc2\xba/g, '\xc3\xba') // u with acute
    .replace(/\xc3\x83\xc2\xa2/g, '\xc3\xa2') // a with circumflex
    .replace(/\xc3\x83\xc2\xb4/g, '\xc3\xb4') // o with circumflex
    .replace(/\xc3\x83\xc2\xb5/g, '\xc3\xb5') // o with tilde
    .replace(/\xc3\x83\xc2\xaa/g, '\xc3\xaa') // e with circumflex
    .replace(/\xc3\x83\xc2\x81/g, '\xc3\x81'); // A with acute uppercase
  
  fs.writeFileSync(filepath, Buffer.from(s, 'binary'));
  
  // Now fix pt-PT vocabulary using proper UTF-8 string operations
  let txt = fs.readFileSync(filepath, 'utf8');
  let changed = false;
  const replacements = [
    ['A carregar\u2026', 'Carregando\u2026'],
    ['A carregar...', 'Carregando...'],
    ['A carregar', 'Carregando'],
    ['equipa ', 'equipe '],
    ['equipa.', 'equipe.'],
    ['equipa,', 'equipe,'],
    ['equipa)', 'equipe)'],
    ['equipa!', 'equipe!'],
    ['equipa"', 'equipe"'],
    ['utilizador', 'usu\u00e1rio'],
    ['Utilizador', 'Usu\u00e1rio'],
    ['telef\u00f3vel', 'celular'],
    ['telem\u00f3vel', 'celular'],
    ['Internamento', 'Interna\u00e7\u00e3o'],
    ['seleccionado', 'selecionado'],
    ['Seleccionado', 'Selecionado'],
    ['registados', 'registrados'],
    ['registado', 'registrado'],
    ['Registado', 'Registrado'],
    ['adicion\u00e1-lo \u00e0 equipa', 'adicion\u00e1-lo \u00e0 equipe'],
  ];
  for (const [from, to] of replacements) {
    if (txt.includes(from)) { txt = txt.split(from).join(to); changed = true; }
  }
  if (changed) fs.writeFileSync(filepath, txt, 'utf8');
}

const files = [
  'src/app/(shell)/paciente/[patientId]/page.tsx',
  'src/components/oncocare/AddPatientByCodeCard.tsx',
  'src/components/oncocare/DashboardKpiStrip.tsx',
  'src/components/oncocare/LinkAccessHistoryPanel.tsx',
  'src/components/PageSkeleton.tsx',
  'src/components/patient/DossierBentoGrid.tsx',
  'src/components/patient/PatientAlertRulesPanel.tsx',
  'src/components/patient/PatientNotesPanel.tsx',
  'src/components/patient/PatientTimelinePanel.tsx',
  'src/components/patient/tabs/PatientAgendamentosPanel.tsx',
  'src/components/patient/tabs/PatientAtividadesPanel.tsx',
  'src/components/patient/tabs/PatientExamesPanel.tsx',
  'src/components/patient/tabs/PatientMensagensDossierPanel.tsx',
  'src/components/patient/tabs/PatientNutricaoPanel.tsx',
  'src/components/patient/VitalsExplorerPanel.tsx',
  'src/components/settings/AuditLogList.tsx',
  'src/components/skeletons/AgendaSkeleton.tsx',
  'src/components/skeletons/DossierSkeleton.tsx',
  'src/components/skeletons/ExamesSkeleton.tsx',
  'src/components/skeletons/InfusionDisplaySkeleton.tsx',
  'src/components/skeletons/MensagensSkeleton.tsx',
  'src/components/skeletons/PatientListSkeleton.tsx',
  'src/components/ui/LoadingInline.tsx',
  'src/lib/supabaseEdgeFetch.ts',
  'src/views/DashboardWorkspacePlaceholder.tsx',
  'src/views/EquipeClinicaPage.tsx',
  'src/views/HospitalSettingsPage.tsx',
  'src/views/InfusionOpsDashboardPage.tsx',
  'src/views/OncoCareAgendaPage.tsx',
  'src/views/OncoCarePatientsPage.tsx',
  'src/views/OncoCareResourceDetailPage.tsx',
  'src/views/PatientDossierPage.tsx',
  'src/views/StaffSettingsPage.tsx',
  'src/views/TriageWorkspaceLayout.tsx',
];

let fixed = 0;
for (const f of files) {
  try { fixFile(f); fixed++; console.log('OK', f); } 
  catch(e) { console.log('ERR', f, e.message); }
}
console.log('\nFixed', fixed, 'files');
