import MultipleChoiceEditor from './editors/MultipleChoiceEditor';
import TrueFalseEditor from './editors/TrueFalseEditor';
import MatchingEditor from './editors/MatchingEditor';
import CompletionEditor from './editors/CompletionEditor';

// EARS[Event]: WHEN question block is rendered THEN it selects the appropriate editor based on block type
function QuestionBlockEditor({ block, onChange }) {
  if (!block.type) return null;

  const renderEditor = () => {
    switch (block.type) {
      case 'Multiple Choice':
        return <MultipleChoiceEditor block={block} onChange={onChange} />;
      
      case 'True/False/Not Given':
      case 'Yes/No/Not Given':
        return <TrueFalseEditor block={block} onChange={onChange} />;
      
      case 'Matching Headings':
      case 'Matching Information':
      case 'Matching Features':
      case 'Matching Sentence Endings':
        return <MatchingEditor block={block} onChange={onChange} />;
      
      case 'Sentence Completion':
      case 'Summary Completion':
      case 'Note/Table/Flow-chart Completion':
      case 'Diagram Label Completion':
      case 'Short-answer Questions':
        return <CompletionEditor block={block} onChange={onChange} />;
      
      default:
        // EARS[Unwanted-State]: IF editor type is not implemented THEN show warning alert
        return (
          <div className="alert alert-warning">
            Editor for <strong>{block.type}</strong> is not yet implemented.
          </div>
        );
    }
  };

  return (
    <div className="question-block-editor mt-3 pt-3 border-top">
      <h6 className="mb-3 text-primary">{block.type} Editor</h6>
      {renderEditor()}
    </div>
  );
}

export default QuestionBlockEditor;
