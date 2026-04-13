describe("Jest Setup Verification", () => {
  it("should run basic test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should have jest-dom matchers available", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    expect(div).toBeInTheDocument();
    document.body.removeChild(div);
  });
});
