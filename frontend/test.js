import { parseSmartText } from './src/utils/questionParser.js';
const t = "Questions 1-5
The text has 5 paragraphs (B - G). Which paragraph contains each of the following pieces of information?
Choose the correct letter A, B, C, D, E or F in boxes 1-5 on your answer sheet.

1. An explanation of how trees can reduce the temperature in cities.
A. Paragraph B
B. Paragraph C
C. Paragraph D
D. Paragraph E
E. Paragraph F
F. Paragraph G

2. The relationship between trees and the amount of energy used by buildings.
A. Paragraph B
B. Paragraph C
C. Paragraph D
D. Paragraph E
E. Paragraph F
F. Paragraph G

3. A warning that trees cannot completely solve the problem of air pollution.
A. Paragraph B
B. Paragraph C
C. Paragraph D
D. Paragraph E
E. Paragraph F
F. Paragraph G

4. The connection between green areas and people's mental well-being.
A. Paragraph B
B. Paragraph C
C. Paragraph D
D. Paragraph E
E. Paragraph F
F. Paragraph G

5. The role of trees in supporting urban wildlife.
A. Paragraph B
B. Paragraph C
C. Paragraph D
D. Paragraph E
E. Paragraph F
F. Paragraph G

[ANSWERS]
1. A
2. B
3. C
4. E
5. F";

console.log(JSON.stringify(parseSmartText(t), null, 2));
