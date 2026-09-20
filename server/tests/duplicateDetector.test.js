import { test, describe } from 'node:test';
import assert from 'node:assert';
import { calculateFileHash, normalizeText } from '../src/utils/fileHash.js';

describe('DuplicateDetector & Hash Utility Test Suite', () => {
  test('Calculates consistent SHA-256 hash for identical file buffers', () => {
    const bufferA = Buffer.from('KTU Workshop Certificate Participation 2023');
    const bufferB = Buffer.from('KTU Workshop Certificate Participation 2023');
    const bufferDifferent = Buffer.from('KTU NSS Camp Certificate 2024');

    const hashA = calculateFileHash(bufferA);
    const hashB = calculateFileHash(bufferB);
    const hashDiff = calculateFileHash(bufferDifferent);

    assert.strictEqual(hashA, hashB);
    assert.notStrictEqual(hashA, hashDiff);
    assert.strictEqual(hashA.length, 64);
  });

  test('Normalizes text removing special characters and whitespace differences', () => {
    const raw1 = '  Hackathon: Smart India -- 2024!  ';
    const raw2 = 'hackathon smart india 2024';

    assert.strictEqual(normalizeText(raw1), normalizeText(raw2));
  });
});
