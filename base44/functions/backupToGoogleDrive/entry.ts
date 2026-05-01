import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BACKUP_ENTITIES = ['Contact', 'Event', 'Task'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const folderName = `Skitza CRM Backup ${timestamp}`;

    const folder = await createDriveFolder(accessToken, folderName);
    const backupData = {};
    const uploadedFiles = [];

    for (const entityName of BACKUP_ENTITIES) {
      const records = await base44.asServiceRole.entities[entityName].list('-updated_date');
      backupData[entityName] = records;

      const jsonFile = await uploadDriveFile(
        accessToken,
        `${entityName}-${timestamp}.json`,
        'application/json',
        JSON.stringify(records, null, 2),
        folder.id
      );
      uploadedFiles.push(jsonFile);

      const csvFile = await uploadDriveFile(
        accessToken,
        `${entityName}-${timestamp}.csv`,
        'text/csv',
        toCsv(records),
        folder.id
      );
      uploadedFiles.push(csvFile);
    }

    const manifest = {
      created_at: now.toISOString(),
      entities: BACKUP_ENTITIES.map((entityName) => ({
        entity_name: entityName,
        records_count: backupData[entityName].length,
      })),
      files: uploadedFiles.map((file) => ({ id: file.id, name: file.name })),
    };

    await uploadDriveFile(
      accessToken,
      `manifest-${timestamp}.json`,
      'application/json',
      JSON.stringify(manifest, null, 2),
      folder.id
    );

    await base44.asServiceRole.entities.AuditLog.create({
      entity_name: 'GoogleDriveBackup',
      entity_id: folder.id,
      action: 'CREATE',
      diff_summary: `גיבוי Google Drive נוצר בהצלחה: ${folderName}`,
      metadata: manifest,
    });

    return Response.json({ success: true, folder_id: folder.id, folder_name: folderName, manifest });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function createDriveFolder(accessToken, name) {
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive folder creation failed: ${errorText}`);
  }

  return response.json();
}

async function uploadDriveFile(accessToken, name, mimeType, content, folderId) {
  const metadata = { name, parents: [folderId] };
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', new Blob([content], { type: mimeType }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive upload failed for ${name}: ${errorText}`);
  }

  return response.json();
}

function toCsv(records) {
  if (!records.length) return '';

  const keys = [...new Set(records.flatMap((record) => Object.keys(record)))];
  const rows = [keys.join(',')];

  for (const record of records) {
    rows.push(keys.map((key) => escapeCsvValue(record[key])).join(','));
  }

  return rows.join('\n');
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}