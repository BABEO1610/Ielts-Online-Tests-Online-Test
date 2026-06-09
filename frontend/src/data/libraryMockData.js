// frontend/src/data/libraryMockData.js
// Nội dung đề thi tự soạn theo chuẩn IELTS — không vi phạm bản quyền

export const mockTests = [
  // ─── READING ───────────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'IELTS Academic Practice Test 1',
    description: 'Bộ đề thi Reading Academic đầy đủ 3 passages, 40 câu hỏi.',
    skill: 'reading',
    level: 'Trung bình',
    pdfSize: '15.2 MB',
    audioSize: null,
    parts: ['Passage 1: The Urban Heat Island Effect', 'Passage 2: Rethinking Plastic', 'Passage 3: The Science of Sleep'],
    questions: 40,
    duration: '60 minutes',
    content: {
      type: 'reading',
      passages: [
        {
          title: 'Passage 1: The Urban Heat Island Effect',
          body: `Urban areas are significantly warmer than their surrounding rural counterparts, a phenomenon known as the Urban Heat Island (UHI) effect. This temperature differential, which can range from 1°C to as much as 10°C, is primarily caused by human activities and the physical characteristics of urban environments.

The main driver of the UHI effect is the replacement of natural land cover with impervious surfaces such as asphalt, concrete, and rooftops. These materials absorb and retain heat far more efficiently than vegetation or soil. Where a forest might reflect 40% of incoming solar radiation, a dark asphalt road absorbs up to 95%. This absorbed heat is then slowly released overnight, keeping cities warmer long after the sun has set.

Waste heat from human activities also plays a significant role. Air conditioning units, vehicles, industrial machinery, and even human bodies all release thermal energy directly into the urban environment. Studies in cities such as Tokyo and Manhattan have shown that anthropogenic heat can account for 20–70% of the UHI intensity during winter months.

The consequences of this warming are far-reaching. Higher temperatures increase demand for air conditioning, which in turn burns more fossil fuels and releases yet more heat — a feedback loop that urban planners increasingly struggle to break. Vulnerable populations, including the elderly and those with pre-existing health conditions, face elevated risks of heat-related illness. The Paris heatwave of 2003, which killed an estimated 15,000 people in France alone, was intensified by the UHI effect in densely built urban centres.

Mitigation strategies are varied. Green roofs, which cover building surfaces with vegetation, can reduce rooftop temperatures by up to 50°C compared to conventional roofing materials. Urban tree canopy programmes provide shade and release moisture through transpiration, cooling surrounding air. Researchers at the Lawrence Berkeley National Laboratory estimate that increasing vegetation cover and installing high-albedo (reflective) materials across major US cities could reduce peak summer temperatures by 2–4°C.

Despite these promising interventions, implementation remains uneven. Wealthier urban districts tend to have greater tree cover and access to green spaces, while lower-income neighbourhoods often bear the brunt of extreme heat. Addressing the UHI effect thus requires not only technological solutions but an equity-conscious approach to urban planning.`,
          questions: [
            {
              type: 'TRUE_FALSE_NG',
              instruction: 'Do the following statements agree with the information in the passage? Write TRUE, FALSE, or NOT GIVEN.',
              items: [
                { num: 1, text: 'Urban areas can be up to 10°C warmer than the surrounding countryside.', answer: 'TRUE' },
                { num: 2, text: 'Asphalt roads reflect more solar radiation than forests.', answer: 'FALSE' },
                { num: 3, text: 'Anthropogenic heat is the single most important cause of the UHI effect in all cities.', answer: 'NOT GIVEN' },
                { num: 4, text: 'Air conditioning contributes to a cycle of increasing urban heat.', answer: 'TRUE' },
                { num: 5, text: 'The 2003 Paris heatwave was caused entirely by the Urban Heat Island effect.', answer: 'FALSE' },
              ],
            },
            {
              type: 'MULTIPLE_CHOICE',
              instruction: 'Choose the correct letter, A, B, C or D.',
              items: [
                {
                  num: 6,
                  text: 'According to the passage, which group faces the greatest health risk from the UHI effect?',
                  options: [
                    { key: 'A', text: 'Industrial workers' },
                    { key: 'B', text: 'Children under five' },
                    { key: 'C', text: 'Elderly people and those with existing health conditions' },
                    { key: 'D', text: 'Outdoor athletes' },
                  ],
                  answer: 'C',
                },
                {
                  num: 7,
                  text: 'What does the writer suggest about current UHI mitigation efforts?',
                  options: [
                    { key: 'A', text: 'They are being applied equally across all urban districts.' },
                    { key: 'B', text: 'Wealthy areas benefit more than poorer neighbourhoods.' },
                    { key: 'C', text: 'Green roofs are not yet proven to be effective.' },
                    { key: 'D', text: 'Governments are investing equally in all solutions.' },
                  ],
                  answer: 'B',
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // ─── LISTENING ─────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'IELTS Listening Mock Test Vol. 1',
    description: 'Đề Listening 4 sections, audio chất lượng cao, dạng bài đa dạng.',
    skill: 'listening',
    level: 'Trung bình',
    pdfSize: '12.0 MB',
    audioSize: '45.5 MB',
    parts: ['Section 1: Booking a Hotel', 'Section 2: Campus Tour', 'Section 3: Academic Discussion', 'Section 4: Lecture on Climate'],
    questions: 40,
    duration: '30 minutes',
    content: {
      type: 'listening',
      sections: [
        {
          title: 'Section 1 — Booking a Hotel',
          context: 'Đây là cuộc hội thoại giữa một khách du lịch (Maria) và nhân viên lễ tân khách sạn (James). Nghe và trả lời câu hỏi.',
          questions: [
            {
              type: 'FORM_COMPLETION',
              instruction: 'Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
              form: {
                title: 'Hotel Reservation Form',
                fields: [
                  { label: 'Guest Name', value: 'Maria _____', answer: 'Chen / Maria Chen', num: 1 },
                  { label: 'Arrival Date', value: '_____', answer: '14th March', num: 2 },
                  { label: 'Number of nights', value: '_____', answer: '5', num: 3 },
                  { label: 'Room type', value: 'Standard _____', answer: 'double', num: 4 },
                  { label: 'Special request', value: '_____', answer: 'sea view', num: 5 },
                  { label: 'Contact number', value: '_____', answer: '07821 443 09', num: 6 },
                ],
              },
            },
          ],
        },
        {
          title: 'Section 2 — Campus Tour',
          context: 'Sinh viên mới nghe hướng dẫn viên giới thiệu khuôn viên trường đại học.',
          questions: [
            {
              type: 'MULTIPLE_CHOICE',
              instruction: 'Choose the correct letter, A, B or C.',
              items: [
                {
                  num: 11,
                  text: 'The library is open until what time on Fridays?',
                  options: [
                    { key: 'A', text: '8 pm' },
                    { key: 'B', text: '9 pm' },
                    { key: 'C', text: '10 pm' },
                  ],
                  answer: 'B',
                },
                {
                  num: 12,
                  text: 'Where is the student health centre located?',
                  options: [
                    { key: 'A', text: 'Next to the sports hall' },
                    { key: 'B', text: 'Behind the main library' },
                    { key: 'C', text: 'Opposite the main entrance' },
                  ],
                  answer: 'A',
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // ─── WRITING ────────────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'IELTS Writing Task 1 & 2 Practice Set',
    description: 'Tổng hợp 20 đề Writing Task 1 & 2 kèm bài mẫu band 7.0 — 8.0.',
    skill: 'writing',
    level: 'Khó',
    pdfSize: '8.5 MB',
    audioSize: null,
    parts: ['Task 1: Bar Chart — Global Energy Consumption', 'Task 2: Essay — Technology & Privacy'],
    questions: 2,
    duration: '60 minutes',
    content: {
      type: 'writing',
      tasks: [
        {
          taskNum: 1,
          title: 'Task 1 — Process Diagram',
          prompt: 'The diagram below shows how electricity is generated in a hydroelectric power station.',
          instruction: 'Summarise the information by selecting and reporting the main features. Write at least 150 words.',
          bandDescriptors: {
            '7+': 'Accurately describes each stage, uses passive voice, clear overview, appropriate linking (First, Then, After that).',
            '5-6': 'Describes most stages but may miss some details or use less precise language.',
          },
          sampleAnswer: `The diagram illustrates the process by which hydroelectric power is generated. First, water from a reservoir flows through a large pipe called a penstock towards the turbines. The kinetic energy of the moving water causes the turbine blades to rotate, which in turn drives an attached generator. Then, the generator converts the mechanical energy into electrical energy. After that, the electricity is transmitted through transformers and finally distributed to households via power lines.`
        },
        {
          taskNum: 2,
          title: 'Task 2 — Essay',
          prompt: `In the modern world, large technology companies collect vast amounts of personal data from individuals. Some people argue that this benefits society through improved services and innovation. Others feel it represents an unacceptable invasion of privacy.

Discuss both views and give your own opinion.`,
          instruction: 'Write at least 250 words.',
          bandDescriptors: {
            '7+': 'Both views clearly discussed, personal opinion integrated, coherent paragraphing, varied complex structures.',
            '5-6': 'Both views mentioned but underdeveloped, limited cohesive devices.',
          },
          sampleAnswer: `The exponential growth of technology companies has enabled unprecedented data collection, sparking intense debate about the balance between utility and privacy. While there are genuine benefits to data-driven services, the potential for misuse raises legitimate concerns that must be addressed.

Proponents of data collection argue that personalised services significantly improve quality of life. Streaming platforms use viewing history to recommend relevant content, navigation apps predict traffic in real time, and healthcare providers employ patient data to accelerate diagnoses. Furthermore, aggregated anonymised data fuels scientific research and economic innovation, driving productivity across industries. In this view, the trade-off is considered worthwhile when services become meaningfully better.

On the other hand, critics contend that the scale and opacity of data collection undermine individual autonomy. Users rarely understand what data is gathered, how it is stored, or with whom it is shared. High-profile breaches — such as the Facebook–Cambridge Analytica scandal — demonstrated how personal information could be exploited to manipulate political opinion. Moreover, disproportionate data collection by large corporations creates asymmetric power relationships that individuals can barely contest.

In my opinion, the benefits of data-driven innovation are real but insufficient justification for unconstrained collection. Strong regulatory frameworks — such as the European Union's GDPR — demonstrate that it is possible to enable innovation while enforcing meaningful privacy rights. Ultimately, technology companies should be required to operate with transparency and obtain genuine informed consent, ensuring that citizens retain control over their own digital identities.`,
        },
      ],
    },
  },

  // ─── SPEAKING ──────────────────────────────────────────────────────────────
  {
    id: 4,
    title: 'IELTS Speaking Mock Test Vol. 1',
    description: 'Câu hỏi Speaking Part 1, 2, 3 kèm bài mẫu trả lời band 7.0+.',
    skill: 'speaking',
    level: 'Trung bình',
    pdfSize: '5.0 MB',
    audioSize: '22.1 MB',
    parts: ['Part 1: Personal Questions', 'Part 2: Cue Card — A memorable journey', 'Part 3: Discussion — Travel & Tourism'],
    questions: 15,
    duration: '15 minutes',
    content: {
      type: 'speaking',
      part1: {
        title: 'Part 1 — Introduction & Interview (~4–5 minutes)',
        topics: [
          {
            topic: 'Hometown',
            questions: [
              'Where are you from originally?',
              'What do you like most about your hometown?',
              'Has your hometown changed much in recent years?',
              'Would you recommend visitors to come to your hometown? Why / Why not?',
            ],
          },
          {
            topic: 'Travel',
            questions: [
              'Do you enjoy travelling?',
              'What kind of places do you prefer to visit when you travel?',
              'How do you usually prepare before going on a trip?',
            ],
          },
        ],
      },
      part2: {
        title: 'Part 2 — Individual Long Turn (~3–4 minutes)',
        cueCard: {
          prompt: 'Describe a memorable journey you have been on.',
          bullets: [
            'Where you went',
            'Who you travelled with',
            'What you did during the journey',
            'Why this journey was particularly memorable for you',
          ],
          timeToPrep: '1 minute prep, speak for ~2 minutes',
        },
        sampleAnswer: `I'd like to talk about a train journey I took through the Swiss Alps about three years ago. I went with my university roommate, and we had booked the famous Glacier Express — a panoramic train that winds through some of Europe's most spectacular mountain scenery.

The journey itself took around eight hours, travelling from Zermatt all the way to St. Moritz. What made it so special was the combination of the breathtaking views — vast fields of snow, dramatic gorges, and tiny alpine villages — and the incredible comfort of the train itself, with floor-to-ceiling windows that framed every vista perfectly. We spent most of the journey photographing the scenery and chatting with a retired couple from Australia who had their own fascinating travel stories.

What made this journey truly memorable, though, was something unexpected. As the train passed through the Furka Pass, we suddenly spotted a small group of ibex — wild mountain goats — standing on an icy ledge just metres from the tracks. Everyone in the carriage fell silent for a moment, and it felt like we were intruding on something genuinely wild and untouched.

I think what I value most from that trip is the reminder that travel doesn't always have to be about the destination. Sometimes the journey itself — in all its unhurried, panoramic glory — is the experience worth having.`,
      },
      part3: {
        title: 'Part 3 — Two-way Discussion (~4–5 minutes)',
        topic: 'Travel & Tourism',
        questions: [
          {
            q: 'How has the way people travel changed over the last few decades?',
            bandSevenTip: 'Mention: low-cost airlines, online booking, solo travel trend, digital nomads.',
          },
          {
            q: 'What are the negative effects of mass tourism on popular destinations?',
            bandSevenTip: 'Discuss: overcrowding, environmental damage, commodification of culture, rising living costs for locals.',
          },
          {
            q: 'Do you think governments should do more to regulate tourism? How?',
            bandSevenTip: 'Use: visitor quotas, tourist taxes, seasonal restrictions, examples (Venice, Santorini, Machu Picchu).',
          },
          {
            q: 'Is virtual or "metaverse" tourism a realistic alternative to physical travel?',
            bandSevenTip: 'Balance benefits (accessibility, sustainability) against limitations (sensory experience, human connection).',
          },
        ],
      },
    },
  },

  // ─── READING (2) ────────────────────────────────────────────────────────────
  {
    id: 5,
    title: 'IELTS Reading Practice Set 2026',
    description: 'Bộ đề Reading cập nhật định dạng mới nhất năm 2026, độ khó cao.',
    skill: 'reading',
    level: 'Khó',
    pdfSize: '18.3 MB',
    audioSize: null,
    parts: ['Passage 1: Urban Farming', 'Passage 2: The Microbiome', 'Passage 3: Dark Matter'],
    questions: 40,
    duration: '60 minutes',
    content: {
      type: 'reading',
      passages: [
        {
          title: 'Passage 1: The Rise of Urban Farming',
          body: `For much of human history, food was grown in rural areas and transported, sometimes great distances, to cities. In recent decades, however, a countervailing trend has emerged: the deliberate cultivation of food within urban boundaries. Urban farming — encompassing rooftop gardens, vertical farms, community allotments, and indoor hydroponic facilities — is reshaping assumptions about where food can and should be produced.

The case for urban farming rests on several pillars. Foremost is the question of food miles: the distance produce travels between farm and consumer. A tomato grown in a heated Dutch greenhouse and shipped to a supermarket in Singapore may have accumulated thousands of kilometres of transport. By contrast, a tomato harvested on the rooftop of that Singapore apartment block requires no such journey. Proponents argue that reducing food miles cuts carbon emissions and delivers fresher, more nutritious produce.

Yet the environmental case for urban farming is more complicated than it first appears. Indoor vertical farms, which grow crops in stacked trays under artificial lighting in climate-controlled warehouses, consume substantial amounts of electricity. Critics point out that unless this electricity comes from renewable sources, the carbon footprint of artificially lit lettuce may actually exceed that of field-grown alternatives shipped from abroad. Research published in the journal Nature Food in 2023 found that indoor-grown lettuce could produce up to 3.5 times more greenhouse gas emissions per kilogram than conventional greenhouse lettuce.

Proponents counter that energy efficiency in vertical farming is improving rapidly and that the technology offers advantages that transcend emissions calculations: water use is reduced by up to 95% compared to conventional farming, no pesticides are required, and crops can be grown year-round regardless of climate. In water-stressed regions of the world, from the Gulf states to sub-Saharan Africa, these advantages may outweigh the energy cost.

Urban farming also carries social dimensions. Community gardens in low-income neighbourhoods have been shown to improve mental health, foster social cohesion, and provide residents with access to fresh produce in areas sometimes described as "food deserts" — localities where affordable, healthy food is scarce. A 2022 study in the American Journal of Public Health found that participants in community garden programmes reported significantly lower levels of stress and anxiety than control groups.

Whether urban farming can meaningfully supplement or even substitute for conventional agriculture remains an open question. Sceptics note that cities currently produce less than 10% of the food they consume, and that the land, water, and energy requirements of scaling urban agriculture to meet city-wide demand would be formidable. Advocates, meanwhile, point to innovations in plant science, automation, and renewable energy as evidence that the constraints of today need not define the possibilities of tomorrow.`,
          questions: [
            {
              type: 'TRUE_FALSE_NG',
              instruction: 'Do the following statements agree with the information in the passage? Write TRUE, FALSE, or NOT GIVEN.',
              items: [
                { num: 1, text: 'Food miles refer to the distance food travels from producer to consumer.', answer: 'TRUE' },
                { num: 2, text: 'Indoor vertical farms always produce lower carbon emissions than conventional farms.', answer: 'FALSE' },
                { num: 3, text: 'The 2023 Nature Food study was conducted in Singapore.', answer: 'NOT GIVEN' },
                { num: 4, text: 'Vertical farming uses significantly less water than traditional agriculture.', answer: 'TRUE' },
                { num: 5, text: '"Food deserts" are areas where healthy food is difficult to access affordably.', answer: 'TRUE' },
              ],
            },
            {
              type: 'MULTIPLE_CHOICE',
              instruction: 'Choose the correct letter, A, B, C or D.',
              items: [
                {
                  num: 6,
                  text: 'What does the writer suggest about the environmental benefits of urban farming?',
                  options: [
                    { key: 'A', text: 'They are straightforward and well-established.' },
                    { key: 'B', text: 'They depend heavily on the energy source used.' },
                    { key: 'C', text: 'They are only relevant in wealthy countries.' },
                    { key: 'D', text: 'They are limited to water savings alone.' },
                  ],
                  answer: 'B',
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // ─── LISTENING (2) ──────────────────────────────────────────────────────────
  {
    id: 6,
    title: 'IELTS Listening Mock Test Vol. 2',
    description: 'Đề Listening nâng cao, dạng bài khó: map labelling, matching, sentence completion.',
    skill: 'listening',
    level: 'Khó',
    pdfSize: '14.8 MB',
    audioSize: '50.3 MB',
    parts: ['Section 1: Renting an Apartment', 'Section 2: Community Event', 'Section 3: Research Project', 'Section 4: Lecture on Biodiversity'],
    questions: 40,
    duration: '30 minutes',
    content: {
      type: 'listening',
      sections: [
        {
          title: 'Section 1 — Renting an Apartment',
          context: 'Cuộc trò chuyện giữa một người thuê nhà (Daniel) và chủ cho thuê (Mrs. Park).',
          questions: [
            {
              type: 'FORM_COMPLETION',
              instruction: 'Complete the rental enquiry form. Write NO MORE THAN THREE WORDS AND/OR A NUMBER.',
              form: {
                title: 'Rental Enquiry Form',
                fields: [
                  { label: 'Applicant', value: 'Daniel _____', answer: 'Okafor', num: 1 },
                  { label: 'Budget (per month)', value: '£_____', answer: '950', num: 2 },
                  { label: 'Preferred area', value: '_____', answer: 'near the station', num: 3 },
                  { label: 'Move-in date', value: '_____', answer: '1st July', num: 4 },
                  { label: 'Lease length', value: '_____ months', answer: '12', num: 5 },
                  { label: 'Pets', value: '_____', answer: 'one cat', num: 6 },
                ],
              },
            },
          ],
        },
        {
          title: 'Section 3 — Research Project Discussion',
          context: 'Hai sinh viên (Priya và Tom) thảo luận về dự án nghiên cứu môi trường với giáo sư.',
          questions: [
            {
              type: 'MULTIPLE_CHOICE',
              instruction: 'Choose TWO letters, A–E.',
              items: [
                {
                  num: 21,
                  text: 'Which TWO problems did Priya and Tom identify with their initial methodology?',
                  options: [
                    { key: 'A', text: 'The sample size was too small.' },
                    { key: 'B', text: 'The data collection period was too short.' },
                    { key: 'C', text: 'Participants misunderstood the survey questions.' },
                    { key: 'D', text: 'The control group was not properly defined.' },
                    { key: 'E', text: 'The analysis software produced errors.' },
                  ],
                  answer: ['A', 'D'],
                  isMulti: true,
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // ─── SPEAKING (2) ───────────────────────────────────────────────────────────
  {
    id: 7,
    title: 'IELTS Trainer Sample Test',
    description: 'Đề Speaking kèm chiến lược trả lời và từ vựng gợi ý band 7+.',
    skill: 'speaking',
    level: 'Dễ',
    pdfSize: '9.7 MB',
    audioSize: '18.6 MB',
    parts: ['Part 1: Hometown & Daily Routine', 'Part 2: Cue Card — A helpful person', 'Part 3: Community & Society'],
    questions: 12,
    duration: '15 minutes',
    content: {
      type: 'speaking',
      part1: {
        title: 'Part 1 — Introduction & Interview',
        topics: [
          {
            topic: 'Daily Routine',
            questions: [
              'What time do you usually wake up in the morning?',
              'Do you prefer mornings or evenings? Why?',
              'Has your daily routine changed recently?',
              'Do you think having a routine is important?',
            ],
          },
          {
            topic: 'Food & Cooking',
            questions: [
              'Do you enjoy cooking?',
              'What is your favourite meal?',
              'Do you prefer eating at home or in a restaurant?',
            ],
          },
        ],
      },
      part2: {
        title: 'Part 2 — Individual Long Turn',
        cueCard: {
          prompt: 'Describe a person who has been particularly helpful to you.',
          bullets: [
            'Who this person is',
            'How you know them',
            'What they did to help you',
            'Why their help was important to you',
          ],
          timeToPrep: '1 minute prep, speak for ~2 minutes',
        },
        sampleAnswer: `I'd like to talk about my secondary school English teacher, Mr. Nguyen, who had an enormous influence on both my academic development and my overall confidence.

I first met Mr. Nguyen when I was about fourteen years old, and from the very beginning, he stood out as someone who genuinely cared about his students as individuals rather than simply as exam candidates. He was the kind of teacher who remembered your interests, checked in if you seemed quiet, and always found time to give detailed written feedback on essays — something that, looking back, must have taken considerable effort.

The help he gave me that I remember most vividly was during the period when I was preparing for national exams and struggling with writing argumentative essays. I was technically competent but lacked the confidence to develop my own voice and take intellectual risks on the page. Mr. Nguyen met with me one-on-one several times, not to correct my grammar but to ask me what I actually thought — what my genuine opinion was — and to help me articulate it clearly. That shift in approach was transformative.

His help mattered to me not only because it improved my grades, but because it changed how I saw myself as a thinker. I went from someone who wrote what I thought examiners wanted to hear, to someone who believed my own perspective had value. That lesson has stayed with me long after the exam results were forgotten.`,
      },
      part3: {
        title: 'Part 3 — Two-way Discussion',
        topic: 'Community & Society',
        questions: [
          {
            q: 'Do you think people today are less connected to their local communities than in the past?',
            bandSevenTip: 'Reference: social media paradox, urban anonymity, decline of third places (pubs, community centres).',
          },
          {
            q: 'What can governments do to encourage a greater sense of community?',
            bandSevenTip: 'Ideas: investment in public spaces, volunteering incentives, local decision-making power.',
          },
          {
            q: 'Is it more important to focus on global issues or local community issues?',
            bandSevenTip: 'Balance both: "Think globally, act locally" principle, interconnectedness of issues.',
          },
        ],
      },
    },
  },

  // ─── WRITING (2) ────────────────────────────────────────────────────────────
  {
    id: 8,
    title: 'IELTS General Training Practice Test',
    description: 'Đề General Training Writing — phù hợp visa định cư, du học nghề nghiệp.',
    skill: 'writing',
    level: 'Trung bình',
    pdfSize: '11.2 MB',
    audioSize: null,
    parts: ['Task 1: Letter — Complaint to Manager', 'Task 2: Essay — Technology in Daily Life'],
    questions: 2,
    duration: '60 minutes',
    content: {
      type: 'writing',
      tasks: [
        {
          taskNum: 1,
          title: 'Task 1 — Formal Letter',
          prompt: `You recently stayed at a hotel and were very dissatisfied with the service. Write a letter to the hotel manager. In your letter:
• explain why you chose that hotel
• describe the problems you experienced
• say what action you would like the manager to take`,
          instruction: 'Write at least 150 words. You do NOT need to write any addresses.',
          bandDescriptors: {
            '7+': 'All three bullet points fully addressed, appropriate formal register, varied vocabulary (dissatisfied, I would appreciate, I trust you will).',
            '5-6': 'All points mentioned but some underdeveloped, register occasionally informal.',
          },
          sampleAnswer: `Dear Sir or Madam,

I am writing to express my deep dissatisfaction with my recent stay at the Grand Pacific Hotel from 3rd to 5th June this year.

I chose your hotel based on its excellent reviews on several travel websites, which praised both the comfort of the rooms and the quality of customer service. Unfortunately, my experience fell far short of these expectations.

Upon arrival, I was informed that my reserved room was unavailable and was offered an alternative on the ground floor, adjacent to the hotel kitchen. The noise from kitchen operations made sleep extremely difficult throughout both nights. Furthermore, when I requested extra towels on the second evening, none were provided despite repeated calls to reception, and the television in the room remained broken for the duration of my stay.

I would appreciate a written apology and a full or partial refund for the inconvenience caused. I trust that you will take appropriate steps to ensure future guests do not experience similar difficulties.

I look forward to your prompt response.

Yours faithfully,
James Thornton`,
        },
        {
          taskNum: 2,
          title: 'Task 2 — Essay',
          prompt: `Some people believe that it is best to accept a bad situation, such as an unsatisfactory job or shortage of money. Others argue that it is better to try and improve such situations.

          Discuss both these views and give your own opinion.`,
          instruction: 'Write at least 250 words.',
          bandDescriptors: {
            '7+': 'Clear position, balanced views, specific examples, complex structures, rich vocabulary.',
            '5-6': 'Both views presented, limited examples, some repetition.',
          },
          sampleAnswer: `Accepting an unsatisfactory situation can provide immediate psychological relief and stability. For example, an employee who remains in a low‑paying job may avoid the stress of a job search, allowing them to focus on family responsibilities or further education. This approach can be practical when the alternatives involve significant risk, such as moving to an unfamiliar city or investing scarce savings in a venture with uncertain returns.

Conversely, striving to improve a difficult circumstance often leads to personal growth and better long‑term outcomes. Consider a graduate who, despite a series of rejections, continues to apply for positions, eventually securing a role that offers both higher salary and career advancement. Persistence can also inspire others; a community that works collectively to upgrade infrastructure, rather than simply accepting poor services, typically achieves lasting improvements.

In my view, the optimal strategy balances acceptance with proactive effort. Short‑term acceptance may be necessary when resources are limited, but it should not replace the pursuit of better opportunities. Individuals and societies benefit most when they recognize when staying put is realistic and when taking calculated risks can lead to greater satisfaction and progress.`,
        },
      ],
    },
  },
];
