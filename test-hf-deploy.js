async function test() {
  const res = await fetch('http://localhost:3000/api/w/default/deployments/test-id/hf-deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spaceName: 'test-space', token: 'hf_dummy' })
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', data);
}
test();
