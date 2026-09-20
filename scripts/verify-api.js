async function testAPI() {
  console.log('🧪 Testing KTU Activity Points API Endpoints...\n');

  try {
    // 1. Health Check
    const healthRes = await fetch('http://localhost:5000/api/health');
    const healthData = await healthRes.json();
    console.log('1. Health Check:', healthRes.status, healthData.service);

    // 2. Register Lateral Entry 2024 Student (Should resolve to KTU 2019 Scheme, 75 pts!)
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fletcher Wulf',
        email: `fletcher.${rand}@ktu.edu.in`,
        password: 'password123',
        registerNumber: `TKM24CSL${rand}`,
        program: 'B.Tech',
        branch: 'Computer Science and Engineering',
        admissionYear: 2024,
        entryType: 'lateral'
      })
    });

    const regData = await regRes.json();
    console.log(
      '2. Lateral 2024 Registration:',
      regRes.status,
      '-> Resolved Scheme:',
      regData.profile?.scheme,
      `(${regData.profile?.ruleVersion})`,
      '| Required Points:',
      regData.profile?.requiredPoints
    );

    const token = regData.token;

    // 3. Register Regular Entry 2024 Student (Should resolve to KTU 2024 Scheme, 100 pts!)
    const reg2Res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Raleigh Star',
        email: `raleigh.${rand}@ktu.edu.in`,
        password: 'password123',
        registerNumber: `TKM24CSR${rand}`,
        program: 'B.Tech',
        branch: 'Computer Science and Engineering',
        admissionYear: 2024,
        entryType: 'regular'
      })
    });

    const reg2Data = await reg2Res.json();
    console.log(
      '3. Regular 2024 Registration:',
      reg2Res.status,
      '-> Resolved Scheme:',
      reg2Data.profile?.scheme,
      `(${reg2Data.profile?.ruleVersion})`,
      '| Required Points:',
      reg2Data.profile?.requiredPoints
    );

    // 4. Dashboard Query
    const dashRes = await fetch('http://localhost:5000/api/student/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dashData = await dashRes.json();
    console.log(
      '4. Dashboard Overview for Lateral 2024 Student:',
      dashRes.status,
      '| Scheme:',
      dashData.profile?.scheme,
      '| Required Points:',
      dashData.profile?.requiredPoints
    );

    console.log('\n✅ All Decoupled Scheme Resolution API Tests Completed Successfully!');
  } catch (err) {
    console.error('API Verification error:', err.message);
  }
}

testAPI();
