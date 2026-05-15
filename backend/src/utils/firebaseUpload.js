const { Readable } = require('stream');
const { getStorageBucket } = require('../config/firebase');

async function uploadRemoteAssetToFirebase(remoteUrl, userId, generationId, folder = 'models') {
  const bucket = getStorageBucket();

  if (!bucket) {
    throw new Error('Firebase Storage is not configured. Missing service account credentials or storage bucket.');
  }

  const upstreamResponse = await fetch(remoteUrl, {
    headers: {
      'User-Agent': 'VirtualAtelierFirebaseUploader/1.0',
    },
  });

  if (!upstreamResponse.ok) {
    throw new Error(`Failed to fetch remote asset from Replicate: ${upstreamResponse.status}`);
  }

  const contentType = upstreamResponse.headers.get('content-type') || 'application/octet-stream';
  const extension = inferExtension(remoteUrl, contentType);
  const arrayBuffer = await upstreamResponse.arrayBuffer();
  const filePath = `users/${userId}/${folder}/${generationId}${extension}`;
  const file = bucket.file(filePath);

  await file.save(Buffer.from(arrayBuffer), {
    resumable: false,
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '2500-01-01',
  });

  return {
    storagePath: filePath,
    publicUrl: signedUrl,
    contentType,
  };
}

async function uploadReplicateOutputToFirebase(fileOutput, userId, generationId, folder = 'models') {
  const bucket = getStorageBucket();

  if (!bucket) {
    throw new Error('Firebase Storage is not configured. Missing service account credentials or storage bucket.');
  }

  if (!fileOutput || typeof fileOutput.pipeTo !== 'function') {
    throw new Error('Replicate output is not a readable file stream.');
  }

  const contentType = 'model/gltf-binary';
  const filePath = `users/${userId}/${folder}/${generationId}.glb`;
  const file = bucket.file(filePath);

  await new Promise((resolve, reject) => {
    const firebaseWriteStream = file.createWriteStream({
      resumable: false,
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    firebaseWriteStream.on('finish', resolve);
    firebaseWriteStream.on('error', reject);

    Readable.fromWeb(fileOutput).on('error', reject).pipe(firebaseWriteStream);
  });

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '2500-01-01',
  });

  return {
    storagePath: filePath,
    publicUrl: signedUrl,
    contentType,
  };
}

module.exports = {
  uploadRemoteAssetToFirebase,
  uploadReplicateOutputToFirebase,
};
