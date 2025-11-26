# WhatsApp Message Categorization

This project implements a machine learning model to categorize WhatsApp business messages into three categories: order, complaint, or inquiry.

## Setup

1. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

2. Set up Kaggle API:
   - Go to your Kaggle account settings
   - Scroll down to the "API" section
   - Click "Create New API Token" to download kaggle.json
   - Place the kaggle.json file in your home directory under `.kaggle/` folder

## Usage

1. First, download the dataset:
   ```
   python data/download_dataset.py
   ```

2. Train the model:
   ```
   python train_model.py
   ```

3. Run the prediction on user input:
   ```
   python predict.py
   ```
   Then enter your message when prompted, or type 'exit' to quit.

## Model Details

- Uses TF-IDF for text vectorization
- Implements LinearSVC classifier
- Includes text preprocessing with NLTK (stopword removal, lemmatization)
- Achieves good accuracy on the test set

## Note

The current implementation uses a rule-based approach for labeling the dataset since the original dataset might not be labeled. In a production environment, you would want to use a properly labeled dataset for training.
