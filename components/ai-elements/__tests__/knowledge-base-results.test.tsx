import { render, screen } from "@testing-library/react";
import { KnowledgeBaseResults } from "../knowledge-base-results";

describe("KnowledgeBaseResults", () => {
  it("renders the header label", () => {
    render(<KnowledgeBaseResults output="[1] Some content here" />);
    expect(screen.getByText("Knowledge base searched")).toBeInTheDocument();
  });

  it("renders a card for each numbered entry", () => {
    const output = "[1] First result content\n\n[2] Second result content\n\n[3] Third result content";
    render(<KnowledgeBaseResults output={output} />);
    const cards = screen.getAllByTestId("result-card");
    expect(cards).toHaveLength(3);
  });

  it("shows the entry text in each card", () => {
    const output = "[1] The quick brown fox\n\n[2] Jumped over the lazy dog";
    render(<KnowledgeBaseResults output={output} />);
    expect(screen.getByText("[1] The quick brown fox")).toBeInTheDocument();
    expect(screen.getByText("[2] Jumped over the lazy dog")).toBeInTheDocument();
  });

  it("truncates content longer than 200 characters", () => {
    const longText = "A".repeat(250);
    render(<KnowledgeBaseResults output={`[1] ${longText}`} />);
    const card = screen.getByTestId("result-card");
    // Truncated text ends with ellipsis and is at most 204 chars ([1] + space + 200 chars + …)
    expect(card.textContent).toMatch(/…$/);
    expect(card.textContent!.length).toBeLessThan(220);
  });

  it("shows 'No results found' message when output indicates no results", () => {
    render(<KnowledgeBaseResults output="No relevant information found in the knowledge base." />);
    expect(screen.getByTestId("no-results")).toBeInTheDocument();
    expect(screen.queryByTestId("results-list")).not.toBeInTheDocument();
  });

  it("shows error message when output indicates an error", () => {
    render(<KnowledgeBaseResults output="Error searching the knowledge base." />);
    expect(screen.getByTestId("no-results")).toBeInTheDocument();
    expect(screen.queryByTestId("results-list")).not.toBeInTheDocument();
  });

  it("renders a single result without splitting", () => {
    render(<KnowledgeBaseResults output="[1] Only one result here" />);
    const cards = screen.getAllByTestId("result-card");
    expect(cards).toHaveLength(1);
  });
});
