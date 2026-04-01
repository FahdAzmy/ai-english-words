import { Word } from '@/lib/types';

// LLM Service - abstraction for different providers
// This will be extended to use OpenAI or Anthropic via AI SDK

export interface LLMResponse {
  text: string;
  wordsUsed: string[];
  isValid: boolean;
}

// Mock LLM responses for development
const mockResponses: Record<string, string[]> = {
  story: [
    'The serendipitous encounter happened on a quiet morning. She walked down the path with an ephemeral grace that captured everyone\'s attention. Her pragmatic approach to solving problems was eloquent in its simplicity, yet her taciturn nature kept most at bay.',
    'In the bustling city, I found myself in an ambiguous situation. The benevolent stranger offered candid advice with such diligent effort. Their ebullient personality was contagious, spreading joy to all around.',
    'The fastidious librarian arranged books with meticulous care, while a garrulous visitor nearby wouldn\'t stop talking. She was a harbinger of literary knowledge, with incisive observations and jocular remarks.',
    'The sagacious elder shared wisdom with those living sedentary lives, offering serendipitous insights. His surreptitious methods revealed ubiquitous truths hidden in plain sight.',
    'Her verbose explanations filled the verbose room, yet she managed to vindicate her complex ideas. The vivacious performance inspired a voracious appetite for learning, though some remained wary.',
  ],
  sentences: [
    'Her serendipitous discovery of the ephemeral art installation left her speechless. The pragmatic artist explained her work with eloquent detail, while critics remained taciturn.',
    'An ambiguous message from the benevolent CEO sparked candid discussions. The diligent team\'s ebullient response surprised everyone with their enthusiasm.',
    'The fastidious designer\'s garrulous assistant served as a harbinger of creative chaos. Their incisive debates turned into jocular banter that lasted hours.',
    'The sagacious mentor advised against a sedentary lifestyle, noting the serendipitous health benefits of exercise. His surreptitious suggestions revealed ubiquitous wellness truths.',
    'The verbose keynote speaker managed to vindicate his complex theories. The vivacious audience\'s voracious questions kept him engaged, though some remained wary of his conclusions.',
  ],
  dialogue: [
    '"That was quite serendipitous," she said, describing the ephemeral moment. He replied with a pragmatic observation, his eloquent voice gentle. "You\'re never taciturn about important matters," she countered.',
    '"This situation seems ambiguous," he noted. "The benevolent approach would be candid communication," she suggested with diligent effort. His ebullient agreement made the conversation delightful.',
    '"Your fastidious attention to detail is admirable," he observed. "And your garrulous commentary is a harbinger of great discussion," she replied with incisive wit. Their jocular exchange continued for hours.',
    '"The sagacious approach," he began, "avoids a sedentary response." "Serendipitous timing," she noted, "but your surreptitious methods miss ubiquitous concerns." He conceded her point thoughtfully.',
    '"Your verbose explanation demands vindication," she said. "The vivacious debate sparked voracious interest," he countered. Though still wary, they found agreement in the end.',
  ],
  writing: [
    'I witnessed a serendipitous moment when an ephemeral butterfly landed on my pragmatic garden design. The eloquent colors contrasted with my usually taciturn surroundings.',
    'The ambiguous instructions from our benevolent manager required candid clarification. Our diligent team\'s ebullient spirit carried us through the challenging project.',
    'My fastidious colleague\'s garrulous nature served as a harbinger of organizational changes. Her incisive feedback, delivered with jocular timing, improved our work significantly.',
    'The sagacious decision to avoid sedentary work proved serendipitous. My surreptitious observations revealed ubiquitous inefficiencies we hadn\'t noticed before.',
    'My verbose journal entry attempted to vindicate my vivacious dreams. The voracious pursuit of excellence, though I remained cautiously wary, finally paid off.',
  ],
};

export async function generateLLMResponse(
  type: 'story' | 'sentences' | 'dialogue' | 'writing',
  words: Word[],
  _prompt?: string
): Promise<LLMResponse> {
  // TODO: Replace with actual LLM call
  // const response = await callOpenAI(prompt);
  // or
  // const response = await callAnthropic(prompt);

  // For now, return mock response
  const responses = mockResponses[type] || [];
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  // Extract which words were used from the response
  const usedWords = words.filter((w) =>
    randomResponse.toLowerCase().includes(w.word.toLowerCase())
  );

  return {
    text: randomResponse,
    wordsUsed: usedWords.map((w) => w.word),
    isValid: usedWords.length > 0,
  };
}

export async function generateFeedback(
  userResponse: string,
  expectedWords: Word[]
): Promise<{ feedback: string; score: number; wordsFound: string[] }> {
  // TODO: Replace with actual LLM call for evaluation

  const wordsFound = expectedWords.filter((w) =>
    userResponse.toLowerCase().includes(w.word.toLowerCase())
  );

  const score = Math.min(100, (wordsFound.length / expectedWords.length) * 100);

  let feedback = '';
  if (score === 100) {
    feedback = '🎉 Excellent! You used all the vocabulary words perfectly!';
  } else if (score >= 80) {
    feedback = '✨ Great effort! You incorporated most of the words naturally.';
  } else if (score >= 60) {
    feedback = '👍 Good work! You used several words correctly. Can you incorporate more?';
  } else if (score >= 40) {
    feedback = '📚 Nice try! Try to use more of the vocabulary words in your writing.';
  } else {
    feedback = '💡 Keep practicing! Look for opportunities to use more of the target words.';
  }

  return {
    feedback,
    score,
    wordsFound: wordsFound.map((w) => w.word),
  };
}

export function validateResponse(response: string, words: Word[]): boolean {
  if (!response || response.trim().length === 0) return false;

  const minWords = Math.max(2, Math.floor(words.length * 0.3));
  const wordsUsed = words.filter((w) =>
    response.toLowerCase().includes(w.word.toLowerCase())
  );

  return wordsUsed.length >= minWords;
}

export function highlightWords(text: string, words: Word[]): string {
  let result = text;
  words.forEach((w) => {
    const regex = new RegExp(`\\b${w.word}\\b`, 'gi');
    result = result.replace(regex, `<mark>${w.word}</mark>`);
  });
  return result;
}
