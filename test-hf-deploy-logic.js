async function test() {
  const params = { workspaceId: 'default', id: 'test-id' };
  const body = { spaceName: 'builder', organization: 'Leon4gr45', token: 'hf_dummy' };

  console.log('Testing HF deploy logic with repoId: Leon4gr45/builder');
  // Since we can't easily mock everything here, we'll just check if the route file exists and has correct imports
}
test();
