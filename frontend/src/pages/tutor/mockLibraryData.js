export const mockLibraryDocuments = [
  {
    id: 'doc-1',
    title: 'Listening Practice Test Vol 1',
    description: 'Bao gồm đề bài PDF và Audio.',
    category: 'Listening',
    files: [
       { type: 'PDF', name: 'de-bai.pdf', size: '2 MB' },
       { type: 'Audio', name: 'track-01.mp3', size: '15 MB' }
    ],
    updatedAt: '14/06/2026',
    sampleData: `Phần thi Listening gồm 40 câu hỏi.\nSection 1: Cuộc gọi điện thoại đặt tour du lịch.\nSection 2: Hướng dẫn tham quan bảo tàng.\nSection 3: Thảo luận nhóm về dự án bảo vệ môi trường.\nSection 4: Bài giảng về lịch sử loài kiến.`
  },
  {
    id: 'doc-2',
    title: 'Cambridge IELTS 16 Academic',
    description: 'Sách luyện đề thi IELTS Academic mới nhất từ Cambridge.',
    category: 'IELTS Academic',
    files: [
       { type: 'PDF', name: 'cambridge-16.pdf', size: '15 MB' }
    ],
    updatedAt: '15/06/2026',
    sampleData: `Đề thi Reading Test 1:\nPassage 1: The History of the Tortoise.\nPassage 2: The Intersection of Health Sciences and Geography.\nPassage 3: Artificial Intelligence in everyday life.`
  },
  {
    id: 'doc-3',
    title: 'IELTS Writing Task 2 Samples',
    description: 'Bộ tài liệu các bài mẫu Writing Task 2 band 8.0+.',
    category: 'Writing',
    files: [
       { type: 'PDF', name: 'writing-task-2.pdf', size: '3 MB' }
    ],
    updatedAt: '10/06/2026',
    sampleData: `Topic: Some people believe that university education should be free for everyone. To what extent do you agree or disagree?\n\nSample Body Paragraph 1:\nOn the one hand, providing free higher education can significantly level the playing field for students from disadvantaged backgrounds...`
  }
];
