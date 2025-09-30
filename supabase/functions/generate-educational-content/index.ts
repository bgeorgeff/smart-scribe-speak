import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, gradeLevel } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!topic || !gradeLevel) {
      throw new Error("Topic and grade level are required");
    }

    console.log(`Generating content for topic: ${topic}, grade: ${gradeLevel}`);

    // First, search for information about the topic
    const searchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an educational content researcher. Your task is to provide accurate, factual information about topics that can be used to create educational content. Include specific facts, dates, names, and processes. Also suggest 3-5 credible sources that would be good for learning more about this topic.'
          },
          {
            role: 'user',
            content: `Research and provide comprehensive information about: ${topic}. Include key facts, important details, and suggest credible sources for further reading.`
          }
        ]
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`Research failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const researchInfo = searchData.choices[0].message.content;

    // Generate grade-appropriate content based on research
    const contentPrompt = getGradeAppropriatePrompt(gradeLevel, topic, researchInfo);

    const contentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: contentPrompt.systemPrompt
          },
          {
            role: 'user',
            content: contentPrompt.userPrompt
          }
        ]
      })
    });

    if (!contentResponse.ok) {
      throw new Error(`Content generation failed: ${contentResponse.status}`);
    }

    const contentData = await contentResponse.json();
    const generatedContent = contentData.choices[0].message.content;

    // Extract content and citations
    const { content, citations } = parseContentAndCitations(generatedContent);

    console.log('Content generated successfully');

    return new Response(
      JSON.stringify({
        content,
        citations,
        gradeLevel,
        topic
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-educational-content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getGradeAppropriatePrompt(gradeLevel: string, topic: string, researchInfo: string) {
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

  const systemPrompt = `You are an expert educational content writer specializing in creating grade-appropriate explanations. 

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
6. Write in an engaging, friendly tone
7. At the end, add a "SOURCES:" section with 3-5 educational sources related to the topic

Format your response exactly like this:
[Your educational content here with headings and paragraphs]

SOURCES:
1. [Source 1 description]
2. [Source 2 description]
3. [Source 3 description]
4. [Source 4 description]
5. [Source 5 description]`;

  const userPrompt = `Create educational content about "${topic}" for grade ${gradeLevel} students. Use this research information to ensure accuracy:

${researchInfo}

Make sure the content is engaging, accurate, and perfectly suited for grade ${gradeLevel} reading level.`;

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