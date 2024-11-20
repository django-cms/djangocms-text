describe('Example Test', () => {
  test('basic test works', () => {
    expect(true).toBe(true);
  });

  test('DOM testing works', () => {
    document.body.innerHTML = '<div id="test">Test Content</div>';
    const element = document.getElementById('test');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Test Content');
  });
});
