import pandas as pd

# More inquiry examples
inquiry_examples = [
    # General inquiries
    "What are your business hours?",
    "When will my order be delivered?",
    "How can I track my package?",
    "Do you offer international shipping?",
    "What payment methods do you accept?",
    "Is this item in stock?",
    "Can I change my delivery address?",
    "What's your return policy?",
    "How do I cancel my order?",
    "Are there any discounts available?",
    "What's included in the basic package?",
    "How do I create an account?",
    "Can I get a refund?",
    "What's the warranty on this product?",
    "Do you have a physical store?",
    "How do I contact customer service?",
    "What's the estimated delivery time?",
    "Can I modify my order?",
    "What's your privacy policy?",
    "How do I reset my password?",
    
    # Billing and payment inquiries
    "How to pay my bill?",
    "How can I pay my bill online?",
    "Where do I find my bill payment options?",
    "What are the different ways to pay my bill?",
    "How do I set up automatic bill payments?",
    "When is my bill due?",
    "Can you explain the charges on my bill?",
    "How do I get a copy of my bill?",
    "What payment methods do you accept?",
    "Is there a late fee for bill payments?",
    "How do I update my payment method?",
    "Can I pay my bill over the phone?",
    "What's the minimum payment required?",
    "How do I get a receipt for my payment?",
    "Is there a discount for auto-pay?",
    "How do I cancel a payment?",
    "Why was my payment declined?",
    "How long does it take for a payment to process?",
    "Can I pay my bill in installments?",
    "How do I get a refund for overpayment?",
    "What's the billing cycle?",
    "How do I change my billing address?",
    "Can I get a detailed bill breakdown?",
    "How do I dispute a charge on my bill?",
    "Is there a fee for paper billing?",
    "How do I enroll in paperless billing?",
    "What's the grace period for late payments?",
    "How do I check my payment history?",
    "Can I pay my bill at a retail location?",
    "What happens if I miss a payment?",
    "How do I set up payment reminders?",
    "Is there a discount for annual payments?",
    "How do I update my credit card information?",
    "Can I pay with PayPal?",
    "What's the service charge for late payment?",
    "How do I get a copy of my payment receipt?",
    "Is there a family plan discount?",
    "How do I check if my payment was received?",
    "What's the procedure for returned payments?",
    "Can I prepay my bill?",
    "How do I change my payment due date?",
    "What's the maximum payment I can make?",
    "How do I contact the billing department?",
    "Is there a fee for using a credit card?",
    "How do I get a billing statement?",
    "What's the process for billing disputes?",
    "Can I pay with multiple payment methods?",
    "How do I check my current balance?",
    "Is there a discount for electronic payments?",
    "How do I update my billing email?",
    "What's the minimum payment amount?",
    "How do I set up a payment plan?",
    "Can I pay with a different currency?",
    "What's the status of my last payment?",
    "How do I get a copy of my invoice?",
    "Is there a fee for international payments?",
    "How do I cancel a scheduled payment?",
    "What's the billing address for checks?",
    "Can I pay with a money order?",
    "How do I request a billing statement?",
    "Is there a discount for annual billing?",
    "How do I update my payment details?",
    "What's the policy on billing errors?",
    "Can I pay with Apple Pay or Google Pay?",
    "How do I check my payment due date?",
    "Is there a fee for paying by phone?",
    "How do I enroll in auto-pay?",
    "What's the process for billing inquiries?",
    
    # More specific examples
    "Could you tell me more about this product?",
    "Would it be possible to get a discount?",
    "Might you have this in a different color?",
    "I was wondering about your return process?",
    "Can you explain how the warranty works?",
    "What's the difference between the basic and premium plans?",
    "Could you clarify your shipping policy?",
    "I'd like to know more about your services",
    "What are the terms and conditions?",
    "How does your loyalty program work?"
]

# More order examples
order_examples = [
    "I want to order a large pizza",
    "Please sign me up for the premium plan",
    "I'd like to schedule a service appointment",
    "Add this to my cart",
    "I want to purchase the new iPhone",
    "Book me a table for two at 7pm",
    "I need to upgrade my subscription",
    "Please process my return",
    "I want to cancel my subscription",
    "Place an order for delivery",
    "Sign me up for the newsletter",
    "I'd like to make a reservation",
    "Please send me a catalog",
    "I want to buy this product",
    "Add this to my order",
    "I need to change my order",
    "Please confirm my purchase",
    "I'd like to pre-order the new model",
    "Process my payment",
    "I want to place a bulk order",
    # More specific examples
    "Please ship this to my home address",
    "I'd like to proceed with the checkout",
    "Please bill my credit card",
    "I want to schedule a delivery for tomorrow",
    "Please add this item to my existing order",
    "I need to place a corporate order",
    "Please process this as a gift order",
    "I want to order a replacement part",
    "Please send me a quote for 100 units",
    "I'd like to make a special order"
]

# Create DataFrames
inquiry_df = pd.DataFrame({
    'message': inquiry_examples,
    'category': ['inquiry'] * len(inquiry_examples)
})

order_df = pd.DataFrame({
    'message': order_examples,
    'category': ['order'] * len(order_examples)
})

# Load existing data
try:
    existing_df = pd.read_csv('../data/messages.csv')
    # Make sure we have the right column name
    if 'message_text' in existing_df.columns and 'message' not in existing_df.columns:
        existing_df = existing_df.rename(columns={'message_text': 'message'})
    # Combine with new examples
    enhanced_df = pd.concat([existing_df, inquiry_df, order_df], ignore_index=True)
except FileNotFoundError:
    # If file doesn't exist, just use the new examples
    enhanced_df = pd.concat([inquiry_df, order_df], ignore_index=True)

# Remove duplicates
enhanced_df = enhanced_df.drop_duplicates(subset=['message'])

# Save enhanced dataset
enhanced_df.to_csv('../data/messages.csv', index=False)

print(f"Enhanced dataset saved with {len(enhanced_df)} total examples")
print("Category distribution:")
print(enhanced_df['category'].value_counts())
