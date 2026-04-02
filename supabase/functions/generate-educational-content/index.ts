import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TOPIC_LENGTH = 500;
const MAX_TIMEZONE_LENGTH = 100;
const VALID_GRADE_LEVELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/\x00/g, '')
    .trim();
}

function validateRequest(body: unknown): { topic: string; gradeLevel: string; userDate?: Date; userTimezone?: string } {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const { topic, gradeLevel, userDate, userTimezone } = body as Record<string, unknown>;

  if (!topic || typeof topic !== 'string') {
    throw new Error('Topic is required and must be a string');
  }
  if (topic.length > MAX_TOPIC_LENGTH) {
    throw new Error(`Topic must be less than ${MAX_TOPIC_LENGTH} characters`);
  }
  const sanitizedTopic = sanitizeInput(topic);
  if (sanitizedTopic.length === 0) {
    throw new Error('Topic cannot be empty');
  }

  if (!gradeLevel || typeof gradeLevel !== 'string') {
    throw new Error('Grade level is required and must be a string');
  }
  if (!VALID_GRADE_LEVELS.includes(gradeLevel)) {
    throw new Error(`Grade level must be one of: ${VALID_GRADE_LEVELS.join(', ')}`);
  }

  let parsedDate: Date | undefined;
  if (userDate !== undefined) {
    if (typeof userDate !== 'string') {
      throw new Error('User date must be a string');
    }
    parsedDate = new Date(userDate);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format');
    }
  }

  let validatedTimezone: string | undefined;
  if (userTimezone !== undefined) {
    if (typeof userTimezone !== 'string') {
      throw new Error('User timezone must be a string');
    }
    if (userTimezone.length > MAX_TIMEZONE_LENGTH) {
      throw new Error(`Timezone must be less than ${MAX_TIMEZONE_LENGTH} characters`);
    }
    validatedTimezone = sanitizeInput(userTimezone);
  }

  return {
    topic: sanitizedTopic,
    gradeLevel,
    userDate: parsedDate,
    userTimezone: validatedTimezone
  };
}

async function authenticateUser(req: Request): Promise<{ userId: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Authentication required');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Server configuration error');
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  
  if (error || !user) {
    throw new Error('Invalid authentication');
  }

  return { userId: user.id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await authenticateUser(req);
    console.log(`Authenticated user: ${userId}`);

    const requestBody = await req.json();
    const { topic, gradeLevel, userDate, userTimezone } = validateRequest(requestBody);
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured in Supabase Edge Function secrets");
    }

    console.log(`Generating content for topic: ${topic}, grade: ${gradeLevel}`);
    
    const currentDate = userDate ?? new Date();
    console.log(`User date: ${currentDate.toLocaleString('en-US', { timeZone: userTimezone || 'UTC' })}`);
    console.log(`User timezone: ${userTimezone || 'UTC'}`);

    const topicLower = topic.toLowerCase();
    const requiresCurrentInfo = topicLower.includes('recent') ||
                               topicLower.includes('latest') ||
                               topicLower.includes('current') ||
                               topicLower.includes('today') ||
                               topicLower.includes('this week') ||
                               topicLower.includes('this month') ||
                               topicLower.includes('this year') ||
                               topicLower.includes('last') ||
                               topicLower.includes('news') ||
                               topicLower.includes('update') ||
                               topicLower.includes('breaking') ||
                               topicLower.includes('announce') ||
                               topicLower.includes('just happened') ||
                               topicLower.includes('game') ||
                               topicLower.includes('match') ||
                               topicLower.includes('event') ||
                               topicLower.includes('right now') ||
                               topicLower.includes('live') ||
                               topicLower.includes('score') ||
                               topicLower.includes('election') ||
                               topicLower.includes('release') ||
                               topicLower.includes('launch') ||
                               topicLower.includes('ranking') ||
                               topicLower.includes('standings') ||
                               topicLower.includes('number one') ||
                               topicLower.includes('number 1') ||
                               topicLower.includes('#1');

    console.log(`Requires current info: ${requiresCurrentInfo}`);

    let researchInfo = '';
    let actualSources: Array<{title: string, url: string}> = [];

    console.log(`Searching web for: ${topic}`);

    const todayFormatted = currentDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: userTimezone || 'UTC'
    });
    const todayShort = currentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: userTimezone || 'UTC'
    });
    const isTodayQuery = topicLower.includes('today');

    const searchQuery = isTodayQuery
      ? `${topic} "${todayFormatted}" OR "${todayShort}"`
      : topic;

    console.log(`Search query: ${searchQuery}`);
    const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5`;

    try {
      const braveKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
      if (braveKey) {
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': braveKey
          }
        });

        if (searchResponse.ok) {
          const searchResults = await searchResponse.json();
          console.log('Search results:', JSON.stringify(searchResults, null, 2));

          if (searchResults.web?.results) {
            actualSources = searchResults.web.results.slice(0, 5).map((result: any) => ({
              title: result.title,
              url: result.url
            }));

            researchInfo = searchResults.web.results
              .slice(0, 5)
              .map((result: any) => `${result.title}\n${result.description}\nSource: ${result.url}`)
              .join('\n\n');

            console.log('Found sources:', actualSources.length);
          }
        } else {
          console.log('Search API failed, falling back to AI research');
        }
      } else {
        console.log('No BRAVE_SEARCH_API_KEY configured, using AI research only');
      }
    } catch (error) {
      console.error('Search error:', error);
    }

    if (!researchInfo) {
      const researchDate = currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        timeZone: userTimezone || 'UTC'
      });
      
      const researchSystemPrompt = requiresCurrentInfo 
        ? `You are an educational content researcher. Today's date is ${researchDate}. Provide the most accurate information you can about recent events. Include specific dates, scores, results, and current facts when available.`
        : 'You are an educational content researcher. Your task is to provide accurate, factual information about topics that can be used to create educational content. Include specific facts, dates, names, and processes.';

      const researchUserPrompt = requiresCurrentInfo
        ? `Today is ${researchDate}. Provide detailed information about: ${topic}. Include the most recent and up-to-date information available.`
        : `Research and provide comprehensive information about: ${topic}. Include key facts and important details.`;

      const aiResearchResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: researchSystemPrompt },
            { role: 'user', content: researchUserPrompt }
          ]
        })
      });

      if (!aiResearchResponse.ok) {
        throw new Error(`AI research failed: ${aiResearchResponse.status}`);
      }

      const aiResearchData = await aiResearchResponse.json();
      researchInfo = aiResearchData.choices[0].message.content;
    }
    
    console.log('Research info length:', researchInfo.length);
    console.log('Actual sources found:', actualSources.length);

    const contentPrompt = getGradeAppropriatePrompt(gradeLevel, topic, researchInfo, requiresCurrentInfo, actualSources, currentDate, userTimezone);

    const todayFmt = currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: userTimezone || 'UTC'
    });
    
    const userPromptWithContext = requiresCurrentInfo && researchInfo ? 
      `CURRENT WEB SEARCH RESULTS (Retrieved: ${currentDate.toLocaleString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: userTimezone || 'UTC'
      })}):\n\n${researchInfo}\n\n---\n\nIMPORTANT: Today is ${todayFmt}. If the user asked about "today's game", you MUST ONLY discuss games that happened on ${todayFmt}. If no game happened on ${todayFmt}, clearly state that.\n\n${contentPrompt.userPrompt}` 
      : contentPrompt.userPrompt;

    const contentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: contentPrompt.systemPrompt },
          { role: 'user', content: userPromptWithContext }
        ]
      })
    });

    if (!contentResponse.ok) {
      throw new Error(`Content generation failed: ${contentResponse.status}`);
    }

    const contentData = await contentResponse.json();
    const generatedContent = contentData.choices[0].message.content;

    let { content, citations } = parseContentAndCitations(generatedContent);
    
    if (citations.length === 0 && actualSources.length > 0) {
      citations = actualSources.map(s => `${s.title} - ${s.url}`);
    }

    console.log('Content generated successfully');

    return new Response(
      JSON.stringify({ content, citations, gradeLevel, topic }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-educational-content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
    
    const isAuthError = errorMessage === 'Authentication required' || errorMessage === 'Invalid authentication';
    const status = isAuthError ? 401 : 500;
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getGradeAppropriatePrompt(gradeLevel: string, topic: string, researchInfo: string, requiresCurrentInfo: boolean = false, actualSources: Array<{title: string, url: string}> = [], currentDate: Date = new Date(), userTimezone: string = 'UTC') {
  const grade = parseInt(gradeLevel);
  
  let complexity, vocabulary, sentenceStructure, examples;
  
  if (grade <= 3) {
    complexity = "very simple concepts with concrete examples";
    vocabulary = "basic, everyday words that young children know";
    sentenceStructure = "short, simple sentences (5-10 words)";
    examples = "relatable examples from their daily life";
  } else if (grade <= 6) {
    complexity = "moderate concepts with clear explanations";
    vocabulary = "grade-level appropriate words with occasional challenging terms explained";
    sentenceStructure = "simple to moderate sentences (8-15 words)";
    examples = "examples from school, home, and community";
  } else if (grade <= 9) {
    complexity = "more detailed concepts with logical connections";
    vocabulary = "advanced vocabulary with definitions for technical terms";
    sentenceStructure = "varied sentence lengths and structures";
    examples = "real-world applications and case studies";
  } else {
    complexity = "comprehensive analysis with multiple perspectives";
    vocabulary = "sophisticated vocabulary appropriate for advanced learners";
    sentenceStructure = "complex sentences with varied structures";
    examples = "in-depth analysis and abstract concepts";
  }

  const currentInfoNote = requiresCurrentInfo 
    ? `\n8. CRITICAL: Today is ${currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: userTimezone })}. Include ONLY the most recent information from ${currentDate.getFullYear()}. Include specific dates, times, scores, and recent details from the research.`
    : '';

  const sourcesNote = actualSources.length > 0
    ? `\n\nUse these actual sources from the research (you MUST include these exact URLs in your SOURCES section):\n${actualSources.map((s, i) => `${i + 1}. ${s.title} - ${s.url}`).join('\n')}`
    : '';

  const isLiveQuery = topic.toLowerCase().includes('right now') || 
                     topic.toLowerCase().includes('live') || 
                     (topic.toLowerCase().includes('current') && topic.toLowerCase().includes('score'));

  const systemPrompt = `You are an expert educational content writer specializing in creating grade-appropriate explanations.

${actualSources.length > 0 ? `⚠️ OVERRIDE INSTRUCTION — THIS TAKES ABSOLUTE PRIORITY:
You have been given live web search results retrieved RIGHT NOW. These results are the ground truth.
Your training data is OUTDATED and MUST be ignored for any facts, names, rankings, scores, or statistics in this response.
DO NOT blend your training knowledge with the search results.
DO NOT fill in gaps with what you "know" — if the search results do not contain a specific fact, say so rather than inventing it from training data.
Every factual claim in your response MUST come directly from the search results provided below.` : ''}

${requiresCurrentInfo && actualSources.length === 0 ? `CRITICAL INSTRUCTION: Today's date is ${currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: userTimezone
  })}. ${isLiveQuery ? 'The user is asking about a LIVE or IN-PROGRESS event. If the search results do not contain live scores or information about a game happening RIGHT NOW, you MUST clearly explain that you cannot access real-time live scores and suggest checking live sports websites.' : ''} You MUST:
1. Use ONLY the information from the web search results provided
2. DO NOT use your training data for current events, live games, or recent information
3. ${isLiveQuery ? 'If this is a "right now" or "live" query and the search results do not show a game in progress, clearly state that there is no live game happening right now' : 'Check if the game/event dates in the search results match the requested date (today, this week, etc.)'}
4. If NO game is scheduled for the requested date, clearly state "There is no [team] game scheduled for [date]" and explain when the most recent game was
5. NEVER present past games as if they happened on the requested date
6. Always include the actual date of the game you're discussing` : ''}

Your task is to write educational content for grade ${gradeLevel} students about ${topic}.

Guidelines for grade ${gradeLevel}:
- Complexity: ${complexity}
- Vocabulary: ${vocabulary}
- Sentence structure: ${sentenceStructure}
- Examples: ${examples}

Content requirements:
1. Write 3-5 well-structured paragraphs
2. Start with a clear, engaging introduction
3. Use headings to organize main topics
4. Include specific facts and details from the research
5. End with a conclusion that summarizes key points
6. Write in an engaging, friendly tone${actualSources.length > 0 ? `
7. At the end, add a "SOURCES:" section with the provided source URLs` : ''}${currentInfoNote}

Format your response exactly like this:
[Your educational content here with headings and paragraphs]
${actualSources.length > 0 ? `
SOURCES:
1. [Source name] - [URL]
2. [Source name] - [URL]
...${sourcesNote}` : `

IMPORTANT: Do NOT include a SOURCES section since no verified web sources are available for this topic.`}`;

  const currentInfoUserNote = requiresCurrentInfo
    ? ` CRITICAL: Today is ${currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: userTimezone })}. Make sure to include ONLY the most recent information from ${currentDate.getFullYear()}.`
    : '';

  const userPrompt = `Create educational content about "${topic}" for grade ${gradeLevel} students. Use this research information to ensure accuracy:

${researchInfo}

Make sure the content is engaging, accurate, and perfectly suited for grade ${gradeLevel} reading level.${currentInfoUserNote}
${actualSources.length > 0 ? `
IMPORTANT: In your SOURCES section, you MUST use the exact URLs provided above. Do not make up or generalize URLs.` : `
IMPORTANT: Do NOT include a SOURCES section or any URLs. No verified web sources are available for this topic.`}`;

  return { systemPrompt, userPrompt };
}

function parseContentAndCitations(generatedContent: string): { content: string; citations: string[] } {
  const sourcesIndex = generatedContent.lastIndexOf('SOURCES:');
  
  if (sourcesIndex === -1) {
    return {
      content: generatedContent.trim(),
      citations: []
    };
  }
  
  const content = generatedContent.substring(0, sourcesIndex).trim();
  const sourcesSection = generatedContent.substring(sourcesIndex + 'SOURCES:'.length).trim();
  
  const citations = sourcesSection
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && /^\d+\./.test(line))
    .map(line => line.replace(/^\d+\.\s*/, '').trim());
  
  return { content, citations };
}
