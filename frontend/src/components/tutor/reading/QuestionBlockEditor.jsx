import MultipleChoiceEditor from './editors/MultipleChoiceEditor';
import TrueFalseEditor from './editors/TrueFalseEditor';
import MatchingEditor from './editors/MatchingEditor';
import CompletionEditor from './editors/CompletionEditor';
import SmartModeBlockEditor from './SmartModeBlockEditor';
import { cleanInstructionText } from '../../../utils/questionParser';

// EARS[Event]: WHEN question block is rendered THEN it selects the appropriate editor based on block type
function QuestionBlockEditor({ block, onChange }) {
  if (!block.type) return null;

  const renderEditor = () => {
    const qType = block.questionType || block.type;
    switch (qType) {
      // Smart Mode MVP New Canonical Types
      case 'MATCHING_INFORMATION':
      case 'MATCHING_HEADINGS':
      case 'SENTENCE_COMPLETION':
      case 'TRUE_FALSE_NOT_GIVEN':
      case 'YES_NO_NOT_GIVEN':
      case 'MULTIPLE_CHOICE_SINGLE':
      case 'MULTIPLE_CHOICE_MULTI':
      case 'SUMMARY_COMPLETION':
      case 'NOTE_COMPLETION':
      case 'NOTES_COMPLETION':
      case 'MATCHING_FEATURES':
      case 'MATCHING_SENTENCE_ENDINGS':
      case 'SHORT_ANSWER_QUESTIONS':
        return <SmartModeBlockEditor block={block} onChange={onChange} />;

      // Legacy cases
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
            Editor for <strong>{qType}</strong> is not yet implemented.
          </div>
        );
    }
  };

  const rawInstruction = block.instruction || block.groupInstruction || (block.questions && block.questions[0]?.options?.groupInstruction) || '';
  const instructionText = cleanInstructionText(rawInstruction, block.rangeStart);

  return (
    <div className="question-block-editor mt-3 pt-3 border-top">
      <h6 className="mb-3 text-primary">{block.questionType || block.type} Editor</h6>
      {instructionText && (
        <div className="mb-4 p-3 bg-light rounded" style={{ fontSize: '0.9rem', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
          {instructionText}
        </div>
      )}
      {renderEditor()}
    </div>
  );
}

export default QuestionBlockEditor;
