import { test, describe } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SchemeResolver } from '../src/services/scheme/SchemeResolver.js';

describe('Auth & Student Profile Logic Unit Test Suite', () => {
  test('Bcrypt hashes and validates password accurately', async () => {
    const rawPassword = 'secureKTUPassword123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    assert.ok(hash.startsWith('$2'));

    const isMatch = await bcrypt.compare(rawPassword, hash);
    assert.strictEqual(isMatch, true);

    const isMismatch = await bcrypt.compare('WrongPassword999', hash);
    assert.strictEqual(isMismatch, false);
  });

  test('JWT generates verifiable token with student ID', () => {
    const secret = 'test_secret_key_12345';
    const userId = '6445cc9021234fd1825f46c6';
    const token = jwt.sign({ userId }, secret, { expiresIn: '1h' });

    assert.ok(token);
    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.userId, userId);
  });

  test('SchemeResolver assigns correct Scheme and Ruleset to student registration payload', () => {
    const regular2019Student = SchemeResolver.resolveScheme({
      admissionYear: 2021,
      entryType: 'regular',
      program: 'B.Tech',
      branch: 'Computer Science and Engineering'
    });

    assert.strictEqual(regular2019Student.scheme, '2019');
    assert.strictEqual(regular2019Student.requiredPoints, 100);

    const lateral2024Student = SchemeResolver.resolveScheme({
      admissionYear: 2025,
      entryType: 'lateral',
      program: 'B.Tech',
      branch: 'Mechanical Engineering'
    });

    assert.strictEqual(lateral2024Student.scheme, '2024');
    assert.strictEqual(lateral2024Student.requiredPoints, 90);
    assert.strictEqual(lateral2024Student.mandatoryCredits, 3);
    assert.strictEqual(lateral2024Student.groupRequirements.group_1.minPoints, 30);
    assert.strictEqual(lateral2024Student.groupRequirements.group_2.minPoints, 30);
    assert.strictEqual(lateral2024Student.groupRequirements.group_3.minPoints, 30);
  });
});
