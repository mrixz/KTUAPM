import { test, describe } from 'node:test';
import assert from 'node:assert';
import { SchemeResolver } from '../src/services/scheme/SchemeResolver.js';
import { ruleLoader } from '../src/services/rules/ruleLoader.js';

describe('SchemeResolver Configurable Applicability Test Suite', async () => {
  await ruleLoader.loadAllRules();

  test('Resolves 2019 Scheme for Regular Entry student admitted 2021 (100 required points)', () => {
    const resolved = SchemeResolver.resolveScheme({
      admissionYear: 2021,
      entryType: 'regular',
      program: 'B.Tech',
      branch: 'Computer Science and Engineering'
    });

    assert.strictEqual(resolved.scheme, '2019');
    assert.strictEqual(resolved.entryType, 'regular');
    assert.strictEqual(resolved.ruleVersion, '2019-v1');
    assert.strictEqual(resolved.requiredPoints, 100);
    assert.strictEqual(resolved.maximumPoints, 100);
    assert.strictEqual(resolved.joiningSemester, 1);
  });

  test('CRITICAL: Resolves 2019 Scheme for Lateral Entry student admitted in 2024 (joins S3 with 2023 batch under 2019 regulation, 75 required points)', () => {
    const resolved = SchemeResolver.resolveScheme({
      admissionYear: 2024,
      entryType: 'lateral',
      program: 'B.Tech',
      branch: 'Computer Science and Engineering'
    });

    // Lateral entry in 2024 belongs to 2019 scheme because they join 2nd year (S3) with 2023 regular entry!
    assert.strictEqual(resolved.scheme, '2019');
    assert.strictEqual(resolved.entryType, 'lateral');
    assert.strictEqual(resolved.ruleVersion, '2019-v1');
    assert.strictEqual(resolved.requiredPoints, 75);
    assert.strictEqual(resolved.maximumPoints, 75);
    assert.strictEqual(resolved.joiningSemester, 3);
  });

  test('Resolves 2024 Scheme for Regular Entry student admitted in 2024 (120 required points, 40 per group)', () => {
    const resolved = SchemeResolver.resolveScheme({
      admissionYear: 2024,
      entryType: 'regular',
      program: 'B.Tech',
      branch: 'Electronics and Communication'
    });

    assert.strictEqual(resolved.scheme, '2024');
    assert.strictEqual(resolved.entryType, 'regular');
    assert.strictEqual(resolved.ruleVersion, '2024-v1');
    assert.strictEqual(resolved.requiredPoints, 120);
    assert.strictEqual(resolved.maximumPoints, 120);
    assert.strictEqual(resolved.mandatoryCredits, 3);
    assert.strictEqual(resolved.joiningSemester, 1);
    assert.strictEqual(resolved.groupRequirements.group_1.minPoints, 40);
    assert.strictEqual(resolved.groupRequirements.group_2.minPoints, 40);
    assert.strictEqual(resolved.groupRequirements.group_3.minPoints, 40);
  });

  test('Resolves 2024 Scheme for Lateral Entry student admitted in 2025 (joins S3 with 2024 regular NEP batch, 90 required points, 30 per group)', () => {
    const resolved = SchemeResolver.resolveScheme({
      admissionYear: 2025,
      entryType: 'lateral',
      program: 'B.Tech',
      branch: 'Mechanical Engineering'
    });

    assert.strictEqual(resolved.scheme, '2024');
    assert.strictEqual(resolved.entryType, 'lateral');
    assert.strictEqual(resolved.ruleVersion, '2024-v1');
    assert.strictEqual(resolved.requiredPoints, 90);
    assert.strictEqual(resolved.maximumPoints, 90);
    assert.strictEqual(resolved.mandatoryCredits, 3);
    assert.strictEqual(resolved.joiningSemester, 3);
    assert.strictEqual(resolved.groupRequirements.group_1.minPoints, 30);
    assert.strictEqual(resolved.groupRequirements.group_2.minPoints, 30);
    assert.strictEqual(resolved.groupRequirements.group_3.minPoints, 30);
  });

  test('Honors explicit curriculumRegulation override (e.g. readmitted or syllabus repeating student)', () => {
    const resolvedRegular = SchemeResolver.resolveScheme({
      admissionYear: 2025,
      entryType: 'regular',
      curriculumRegulation: '2019',
      program: 'B.Tech',
      branch: 'Civil Engineering'
    });

    assert.strictEqual(resolvedRegular.scheme, '2019');
    assert.strictEqual(resolvedRegular.ruleVersion, '2019-v1');
    assert.strictEqual(resolvedRegular.requiredPoints, 100);

    const resolvedLateral = SchemeResolver.resolveScheme({
      admissionYear: 2026,
      entryType: 'lateral',
      curriculumRegulation: '2019',
      program: 'B.Tech',
      branch: 'Civil Engineering'
    });

    assert.strictEqual(resolvedLateral.scheme, '2019');
    assert.strictEqual(resolvedLateral.ruleVersion, '2019-v1');
    assert.strictEqual(resolvedLateral.requiredPoints, 75);
    assert.strictEqual(resolvedLateral.joiningSemester, 3);
  });

  test('Ensures requiredPoints is strictly derived from the matched rule set definition and never mixed', () => {
    const rule2019 = ruleLoader.getRuleSet('2019');
    const rule2024 = ruleLoader.getRuleSet('2024');

    const res2019Reg = SchemeResolver.resolveScheme({ admissionYear: 2022, entryType: 'regular' });
    assert.strictEqual(res2019Reg.requiredPoints, rule2019.academicRequirements.regular.requiredPoints);
    assert.strictEqual(res2019Reg.requiredPoints, 100);

    const res2019Lat = SchemeResolver.resolveScheme({ admissionYear: 2024, entryType: 'lateral' });
    assert.strictEqual(res2019Lat.requiredPoints, rule2019.academicRequirements.lateral.requiredPoints);
    assert.strictEqual(res2019Lat.requiredPoints, 75);

    const res2024Reg = SchemeResolver.resolveScheme({ admissionYear: 2024, entryType: 'regular' });
    assert.strictEqual(res2024Reg.requiredPoints, rule2024.academicRequirements.regular.requiredPoints);
    assert.strictEqual(res2024Reg.requiredPoints, 120);

    const res2024Lat = SchemeResolver.resolveScheme({ admissionYear: 2025, entryType: 'lateral' });
    assert.strictEqual(res2024Lat.requiredPoints, rule2024.academicRequirements.lateral.requiredPoints);
    assert.strictEqual(res2024Lat.requiredPoints, 90);
  });

  test('CRITICAL DEFENSE: Throws error if invalid cross-scheme data is ever injected', () => {
    assert.throws(() => {
      SchemeResolver._validateResolution({
        scheme: '2024',
        entryType: 'lateral',
        requiredPoints: 75
      });
    }, /CRITICAL RULE ENGINE ERROR: 2024 Lateral Entry requires exactly 90 points/);

    assert.throws(() => {
      SchemeResolver._validateResolution({
        scheme: '2019',
        entryType: 'lateral',
        requiredPoints: 90
      });
    }, /CRITICAL RULE ENGINE ERROR: 2019 Lateral Entry requires exactly 75 points/);
  });
});

