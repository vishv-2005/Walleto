import pandas as pd
import random
from datetime import datetime, timedelta

# Load existing data
try:
    df = pd.read_csv('../data/messages.csv')
except Exception as e:
    print(f"Error loading messages.csv: {e}")
    exit()

# Helper function to generate random dates for orders
def random_future_date():
    return (datetime.now() + timedelta(days=random.randint(1, 60))).strftime("%Y-%m-%d")

# Enhanced sentiment-based examples
sentiment_examples = [
    # Negative Sentiment (Complaints)
    {"message": "I absolutely hate this service, it's the worst!", "category": "complaint"},
    {"message": "This is completely unacceptable, I'm very disappointed.", "category": "complaint"},
    {"message": "I'm extremely frustrated with your terrible service.", "category": "complaint"},
    {"message": "The quality is absolutely awful, never again!", "category": "complaint"},
    {"message": "I'm so angry about this horrible experience.", "category": "complaint"},
    {"message": "This is ridiculous, I can't believe how bad this is.", "category": "complaint"},
    {"message": "I'm extremely dissatisfied with your service.", "category": "complaint"},
    {"message": "This is the worst experience I've ever had.", "category": "complaint"},
    
    # Positive Sentiment (Inquiries/Orders)
    {"message": "I absolutely love your service, it's amazing!", "category": "inquiry"},
    {"message": "This is the best experience I've ever had, thank you!", "category": "inquiry"},
    {"message": f"I'd love to order your premium package, it's fantastic!", "category": "order"},
    {"message": "Your service is outstanding, can't wait to recommend it!", "category": "inquiry"},
    
    # Mixed Sentiment (Complex Cases)
    {"message": "I love your products but the delivery was late.", "category": "complaint"},
    {"message": "Great quality but way too expensive for what you get.", "category": "complaint"},
    {"message": "The customer service was excellent but the product broke quickly.", "category": "complaint"},
    
    # Sarcastic/Indirect (Complaints/Inquiries)
    {"message": "Oh great, another day without my order.", "category": "complaint"},
    {"message": "Wow, I'm so impressed with how late this is.", "category": "complaint"},
    {"message": "Because what I wanted was a broken product, thanks!", "category": "complaint"},
    
    # Grateful/Appreciative (Inquiries/Orders)
    {"message": "I'm so grateful for your excellent service!", "category": "inquiry"},
    {"message": "Thank you for the wonderful experience.", "category": "inquiry"},
    {"message": f"I'd love to order another one of these amazing products!", "category": "order"},
    
    # Frustrated but Polite (Complaints)
    {"message": "I'm sorry to say I'm quite disappointed with my purchase.", "category": "complaint"},
    {"message": "I was really hoping for better quality than this.", "category": "complaint"},
    {"message": "This isn't quite what I was expecting, to be honest.", "category": "complaint"},
    
    # Enthusiastic (Inquiries/Orders)
    {"message": f"I'm absolutely thrilled with my purchase, when can I order more?", "category": "inquiry"},
    {"message": "This is exactly what I was looking for, how do I get another?", "category": "inquiry"},
    {"message": "You've made me a customer for life with this service!", "category": "inquiry"},
    
    # Urgent/Time-sensitive (All Categories)
    {"message": "I need this fixed immediately, this is completely unacceptable!", "category": "complaint"},
    {"message": "Urgent: Can I get this delivered by tomorrow? It's very important!", "category": "order"},
    {"message": "Quick question: What's your return policy? Need to know ASAP!", "category": "inquiry"},
    
    # Confused/Needs Clarification (Inquiries)
    {"message": "I'm not sure I understand how this works, can you explain?", "category": "inquiry"},
    {"message": "The instructions were unclear, can you help me with this?", "category": "inquiry"},
    
    # Apologetic (All Categories)
    {"message": "I'm so sorry, but I think there's been a mistake with my order.", "category": "complaint"},
    {"message": "I hate to complain, but I'm not satisfied with my purchase.", "category": "complaint"},
    
    # Excited/Enthusiastic (Orders/Inquiries)
    {"message": f"I can't wait to try out your service, it looks amazing!", "category": "inquiry"},
    {"message": "This is exactly what I've been looking for! How do I order?", "category": "order"},
    
    # Disappointed (Complaints)
    {"message": "I had such high hopes for this, but I'm really disappointed.", "category": "complaint"},
    {"message": "This doesn't live up to the hype at all, I want my money back.", "category": "complaint"},
    
    # Grateful (Inquiries/Orders)
    {"message": "Thank you so much for your help, I really appreciate it!", "category": "inquiry"},
    {"message": "I'm so happy with my purchase, can I order another one?", "category": "order"},
    
    # Frustrated (Complaints)
    {"message": "I've had nothing but problems with this service, I'm at my wit's end!", "category": "complaint"},
    {"message": "This is the third time I've had to contact support, fix this now!", "category": "complaint"},
    
    # Curious (Inquiries)
    {"message": "I'm really interested in your service, can you tell me more?", "category": "inquiry"},
    {"message": "How does this compare to your other products?", "category": "inquiry"},
    
    # Order-related with Sentiment
    {"message": f"I'm so excited to place my first order with you!", "category": "order"},
    {"message": f"I'd love to order your premium package, it looks amazing!", "category": "order"},
    {"message": "I'm really disappointed with my last order, but I'd like to give it another try.", "category": "order"},
    
    # Inquiry-related with Sentiment
    {"message": "I'm really impressed with what I've seen so far, can you tell me more?", "category": "inquiry"},
    {"message": "I'm a bit confused about your pricing, can you clarify?", "category": "inquiry"},
    
    # Complaint-related with Strong Sentiment
    {"message": "I'm absolutely furious about the poor service I received!", "category": "complaint"},
    {"message": "This is completely unacceptable and needs to be fixed immediately!", "category": "complaint"},
    {"message": "I'm furious about how bad this is.", "category": "complaint"},
    {"message": "This is the most frustrating thing ever.", "category": "complaint"},
    {"message": "I can't stand how poor the quality is.", "category": "complaint"},
    {"message": "I'm thoroughly disappointed with everything.", "category": "complaint"},
    {"message": "This is beyond terrible, I'm shocked.", "category": "complaint"},
    {"message": "I'm so upset with this horrible service.", "category": "complaint"},
    {"message": "This is completely ridiculous, I'm done.", "category": "complaint"},
    {"message": "I'm extremely unhappy with this situation.", "category": "complaint"},
    {"message": "The service is shockingly bad, I'm appalled.", "category": "complaint"},
    {"message": "I'm beyond disappointed, this is unacceptable.", "category": "complaint"}
]

# Create DataFrame for new examples
new_examples = pd.DataFrame(sentiment_examples)

# Combine with existing data
combined_df = pd.concat([df, new_examples], ignore_index=True)

# Remove any potential duplicates
combined_df = combined_df.drop_duplicates(subset=['message'], keep='first')

# Save the enhanced dataset
combined_df.to_csv('../data/messages.csv', index=False)

# Print summary
print(f"Added {len(new_examples)} sentiment-based examples to the dataset.")
print(f"Total examples after adding: {len(combined_df)}")
print("\nCategory distribution in the updated dataset:")
print(combined_df['category'].value_counts())
