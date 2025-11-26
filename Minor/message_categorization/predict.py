import joblib
import os
from train_model import MessageCategorizer

def load_model(model_dir='models'):
    try:
        model = joblib.load(f'{model_dir}/message_classifier.joblib')
        vectorizer = joblib.load(f'{model_dir}/vectorizer.joblib')
        return model, vectorizer
    except Exception as e:
        print(f"Error loading model: {e}")
        return None, None

def predict_category(message, model, vectorizer):
    # Preprocess the message
    categorizer = MessageCategorizer()
    cleaned_message = categorizer.clean_text(message)
    
    # Vectorize the message
    message_vec = vectorizer.transform([cleaned_message])
    
    # Predict the category
    category = model.predict(message_vec)[0]
    return category

def main():
    # Load the model and vectorizer
    print("Loading the message categorizer...")
    model, vectorizer = load_model()
    
    if model is None or vectorizer is None:
        print("Error: Could not load the model. Please train the model first.")
        return
    
    print("\nMessage Categorization Tool")
    print("Categories: order, complaint, inquiry")
    print("Type 'exit' to quit\n")
    
    while True:
        # Get user input
        message = input("Enter your message: ")
        
        if message.lower() == 'exit':
            print("Goodbye!")
            break
        
        # Make prediction
        category = predict_category(message, model, vectorizer)
        print(f"\nCategory: {category}\n")

if __name__ == "__main__":
    main()
