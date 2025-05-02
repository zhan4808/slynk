import { ProductVideo } from "@/lib/types"

/**
 * Simple text similarity calculation using word overlap and TF-IDF approach
 * @param text1 First text to compare
 * @param text2 Second text to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0
  
  // Convert to lowercase and tokenize
  const tokens1 = text1.toLowerCase().split(/\W+/).filter(t => t.length > 2)
  const tokens2 = text2.toLowerCase().split(/\W+/).filter(t => t.length > 2)
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0
  
  // Create a set of unique words from both texts
  const allTokens = new Set([...tokens1, ...tokens2])
  
  // Count word frequencies in each text
  const freq1 = getWordFrequencies(tokens1)
  const freq2 = getWordFrequencies(tokens2)
  
  // Calculate dot product
  let dotProduct = 0
  let magnitude1 = 0
  let magnitude2 = 0
  
  allTokens.forEach(token => {
    // For TF-IDF, we weight less common words more highly
    const weight = 1 + Math.log(1 + (allTokens.size / Math.max(
      tokens1.filter(t => t === token).length, 
      tokens2.filter(t => t === token).length, 
      1
    )))
    
    const f1 = freq1[token] || 0
    const f2 = freq2[token] || 0
    
    dotProduct += f1 * f2 * weight
    magnitude1 += Math.pow(f1 * weight, 2)
    magnitude2 += Math.pow(f2 * weight, 2)
  })
  
  magnitude1 = Math.sqrt(magnitude1)
  magnitude2 = Math.sqrt(magnitude2)
  
  // Calculate cosine similarity
  if (magnitude1 === 0 || magnitude2 === 0) return 0
  return dotProduct / (magnitude1 * magnitude2)
}

/**
 * Create a word frequency map from an array of tokens
 */
function getWordFrequencies(tokens: string[]): Record<string, number> {
  const frequencies: Record<string, number> = {}
  
  tokens.forEach(token => {
    frequencies[token] = (frequencies[token] || 0) + 1
  })
  
  // Normalize frequencies
  const totalTokens = tokens.length
  Object.keys(frequencies).forEach(token => {
    frequencies[token] = frequencies[token] / totalTokens
  })
  
  return frequencies
}

/**
 * Find the most relevant product video based on the user message
 * @param message User's message
 * @param videos List of available product videos
 * @returns The most relevant video or undefined if no videos available
 */
export function findRelevantVideo(
  message: string, 
  videos: ProductVideo[]
): { video: ProductVideo; score: number } | undefined {
  if (!videos || videos.length === 0) return undefined
  
  // If only one video, return it
  if (videos.length === 1) {
    return { video: videos[0], score: 1 }
  }
  
  // Calculate similarity between message and each video's keywords and description
  const scoredVideos = videos.map(video => {
    // Combine the video's title, description and keywords for matching
    const videoText = [
      video.title,
      video.description || "",
      video.keywords || ""
    ].filter(Boolean).join(" ")
    
    const score = calculateTextSimilarity(message, videoText)
    return { video, score }
  })
  
  // Sort by similarity score (descending)
  scoredVideos.sort((a, b) => b.score - a.score)
  
  // Return the highest-scoring video
  return scoredVideos[0].score > 0 ? scoredVideos[0] : undefined
}

/**
 * Analyze user message to determine if it's a question about the product,
 * which can be used to trigger showing a relevant product video
 */
export function isProductQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  
  // Common product question patterns
  const questionPatterns = [
    /how (does|do) (it|this|the|your) work/,
    /what (is|are) (the|your) (feature|benefit|advantage|spec)/,
    /tell me (about|more)/,
    /show me/,
    /can (it|this|the product) /,
    /how much (does|is|will)/,
    /when (can|will)/,
    /where (can|should)/,
    /why (should|would)/
  ]
  
  // Product-related keywords
  const productKeywords = [
    'product', 'service', 'feature', 'benefit', 'advantage', 'price', 
    'cost', 'quality', 'performance', 'specification', 'detail',
    'work', 'function', 'use', 'buy', 'purchase', 'order', 'shipping',
    'warranty', 'return', 'refund', 'model', 'version', 'compare',
    'difference', 'similar', 'alternative', 'competitor', 'review'
  ]
  
  // Check for question patterns
  const hasQuestionPattern = questionPatterns.some(pattern => 
    pattern.test(lowerMessage)
  )
  
  // Check for product keywords
  const hasProductKeyword = productKeywords.some(keyword => 
    lowerMessage.includes(keyword)
  )
  
  // Look for question mark
  const hasQuestionMark = lowerMessage.includes('?')
  
  // If there's a direct question pattern, definitely count it
  if (hasQuestionPattern) return true
  
  // If it has a question mark AND product keywords, also count it
  if (hasQuestionMark && hasProductKeyword) return true
  
  // If it has multiple product keywords, also consider it product-related
  const keywordCount = productKeywords.filter(keyword => 
    lowerMessage.includes(keyword)
  ).length
  
  return keywordCount >= 2
} 