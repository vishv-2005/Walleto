import pandas as pd
import numpy as np
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.svm import LinearSVC
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
from nltk.sentiment import SentimentIntensityAnalyzer

# Download required NLTK data
nltk.download('stopwords')
nltk.download('wordnet')
nltk.download('omw-1.4')
nltk.download('vader_lexicon')

class MessageCategorizer:
    def __init__(self):
        # Initialize sentiment analyzer
        self.sia = SentimentIntensityAnalyzer()
        
        # Enhanced stopwords
        self.stop_words = set(stopwords.words('english'))
        self.stop_words.update(['hi', 'hello', 'hey', 'thanks', 'thank', 'please', 'pls', 'plz', 'ok', 'yeah', 'yes', 'no'])
        
        # Sentiment words to enhance
        self.positive_words = ['great', 'good', 'excellent', 'amazing', 'wonderful', 'perfect', 'love', 'like', 'awesome', 'fantastic']
        self.negative_words = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'disappointed', 'poor', 'worst', 'annoying', 'frustrating']
        
        # Initialize vectorizer with custom token pattern
        self.vectorizer = TfidfVectorizer(
            max_features=10000,
            ngram_range=(1, 3),
            analyzer='char_wb',
            min_df=2,
            max_df=0.95,
            token_pattern=r'\b[^\d\W]+\b'  # Match words without numbers
        )
        
        self.model = LinearSVC(
            class_weight='balanced',
            max_iter=10000,
            C=0.8,
            penalty='l2'
        )
        
        self.lemmatizer = WordNetLemmatizer()
        # Categories will be determined from the data, but we'll initialize with these as fallback
        self.categories = ['order', 'complaint', 'inquiry', 'invalid']
    
    def clean_text(self, text):
        if not isinstance(text, str):
            return ""
            
        # Convert to lowercase
        text = text.lower()
        
        # Keep important punctuation that indicates questions or sentiment
        question_indicators = ['?', 'what', 'when', 'where', 'why', 'how', 'can', 'could', 'would', 'will', 'is', 'are', 'do', 'does', 'did']
        
        # Extract question mark presence before removing punctuation
        has_question_mark = '?' in text
        has_exclamation = '!' in text
        
        # Remove special characters but keep question marks and exclamation
        text = re.sub(r'[^a-zA-Z\s?!]', ' ', text)
        
        # Tokenize
        words = text.split()
        
        # Check for question indicators
        is_question = has_question_mark or any(indicator in words for indicator in question_indicators)
        
        # Enhanced sentiment analysis
        sentiment = self.sia.polarity_scores(text)
        is_negative = sentiment['neg'] > 0.3
        is_positive = sentiment['pos'] > 0.5
        
        # Lemmatize and clean words
        words = [self.lemmatizer.lemmatize(word) for word in words 
                if word not in self.stop_words or word in question_indicators]
        
        # Add features based on sentiment and structure
        if is_question and 'question' not in words:
            words.append('question')
        if has_exclamation and 'exclamation' not in words:
            words.append('exclamation')
        if is_negative and 'negative_sentiment' not in words:
            words.append('negative_sentiment')
        if is_positive and 'positive_sentiment' not in words:
            words.append('positive_sentiment')
            
        # Add n-grams for better context
        bigrams = ['_'.join(words[i:i+2]) for i in range(len(words)-1)]
        words.extend(bigrams)
            
        return ' '.join(words)
    
    def load_data(self, filepath):
        # Load the dataset
        df = pd.read_csv(filepath)
        
        # Handle different column names
        message_col = 'message_text' if 'message_text' in df.columns else 'message'
        
        # Clean the messages
        df['cleaned_message'] = df[message_col].apply(self.clean_text)
        
        # Filter out any empty messages
        df = df[df['cleaned_message'].str.strip().astype(bool)]
        
        # Ensure all categories are valid
        valid_categories = self.categories
        df = df[df['category'].isin(valid_categories)]
        
        # Print class distribution
        print("\nClass distribution:")
        print(df['category'].value_counts())
        
        return df[['cleaned_message', 'category']].rename(columns={'cleaned_message': 'message'})
    
    def train(self, X, y):
        # Vectorize the text data
        print("Vectorizing text data...")
        X_vec = self.vectorizer.fit_transform(X)
        
        # Get unique classes in the data
        unique_classes = sorted(y.unique())
        print(f"\nFound {len(unique_classes)} classes: {', '.join(unique_classes)}")
        
        # Update model's categories to match the data
        self.categories = unique_classes
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X_vec, y, test_size=0.2, random_state=42, stratify=y
        )
        
        print(f"\nTraining samples: {X_train.shape[0]}")
        print(f"Testing samples: {X_test.shape[0]}")
        
        # Train the model
        print("\nTraining the model...")
        self.model.fit(X_train, y_train)
        
        # Evaluate on test set
        print("\nEvaluating on test set...")
        y_pred = self.model.predict(X_test)
        
        # Print evaluation metrics
        print("\n" + "="*50)
        print("MODEL EVALUATION")
        print("="*50)
        print(f"\nAccuracy: {accuracy_score(y_test, y_pred):.4f}")
        
        # Detailed classification report
        print("\nClassification Report:")
        print("-"*60)
        print(classification_report(y_test, y_pred, target_names=self.categories))
        
        # Cross-validation for more robust evaluation
        from sklearn.model_selection import cross_val_score
        print("\nPerforming 5-fold cross-validation...")
        cv_scores = cross_val_score(self.model, X_vec, y, cv=5)
        print(f"Cross-validation scores: {cv_scores}")
        print(f"Mean CV accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        
        # Feature importance (top 10 features per class)
        print("\nTop 10 important features per class:")
        feature_names = self.vectorizer.get_feature_names_out()
        for i, class_name in enumerate(self.categories):
            try:
                top_features = np.argsort(self.model.coef_[i])[-10:][::-1]
                top_feature_names = [feature_names[j] for j in top_features]
                print(f"\n{class_name.upper()}:")
                print(", ".join(top_feature_names))
            except IndexError:
                continue
    
    def save_model(self, model_dir='models'):
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
        joblib.dump(self.model, f'{model_dir}/message_classifier.joblib')
        joblib.dump(self.vectorizer, f'{model_dir}/vectorizer.joblib')
        print(f"\nModel and vectorizer saved to {model_dir}/")

def main():
    # Initialize the categorizer
    categorizer = MessageCategorizer()
    
    # Load and preprocess data
    print("Loading and preprocessing data...")
    data = categorizer.load_data('../data/enhanced_messages.csv')
    
    # Print dataset information
    print("\nDataset information:")
    print(f"Total samples: {len(data)}")
    print("\nClass distribution:")
    print(data['category'].value_counts())
    
    # Train the model
    print("\nTraining model...")
    categorizer.train(data['message'], data['category'])
    
    # Save the model
    model_dir = 'models'
    categorizer.save_model(model_dir)
    
    # Print completion message
    print("\nTraining complete!")
    print(f"Model and vectorizer saved to: {os.path.abspath(model_dir)}/")

if __name__ == "__main__":
    main()
