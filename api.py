from flask import Flask, request, jsonify, send_from_directory, redirect, session
from flask_cors import CORS
from requests_oauthlib import OAuth2Session
import yaml
import os
from pathlib import Path
from main import create_and_run_bot

app = Flask(__name__, static_url_path='')
CORS(app)
app.secret_key = os.urandom(24)  # Required for session management


@app.route('/')
def serve_frontend():
    return send_from_directory('static', 'index.html')


DATA_FOLDER = Path("data_folder")
DATA_FOLDER.mkdir(exist_ok=True)


@app.route('/')
def status():
    return jsonify({"status": "running"}), 200


@app.route('/api/config', methods=['POST'])
def update_config():
    try:
        data = request.get_json()
        with open(DATA_FOLDER / 'config.yaml', 'w') as f:
            yaml.dump(data, f)
        return jsonify({"message": "Config updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


'''@app.route('/api/secrets', methods=['POST'])
def update_secrets():
    try:
        data = request.get_json()
        with open(DATA_FOLDER / 'secrets.yaml', 'w') as f:
            yaml.dump(data, f)
        return jsonify({"message": "Secrets updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500'''


@app.route('/api/resume', methods=['POST'])
def update_resume():
    try:
        data = request.get_json()
        with open(DATA_FOLDER / 'plain_text_resume.yaml', 'w') as f:
            yaml.dump(data, f)
        return jsonify({"message": "Resume updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/start', methods=['GET'])
def start_application():
    try:
        with app.app_context():
            # Run the bot
            create_and_run_bot()
            return jsonify({
                "status": "completed",
                "message": "Application completed successfully"
            }), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


# LinkedIn OAuth Configuration
'''from config_manager import ConfigManager

config = ConfigManager()
credentials = config.load_credentials()

if not credentials:
    credentials = {
        'LINKEDIN_CLIENT_ID': 'dummy',
        'LINKEDIN_CLIENT_SECRET': 'dummy',
        'OPENAI_API_KEY': 'dummy'
    }
    config.save_credentials(credentials)

LINKEDIN_CLIENT_ID = credentials['LINKEDIN_CLIENT_ID']
LINKEDIN_CLIENT_SECRET = credentials['LINKEDIN_CLIENT_SECRET']
LINKEDIN_REDIRECT_URI = "http://localhost:5000/linkedin/callback" if not os.environ.get(
    'REPL_SLUG'
) else f"https://{os.environ.get('REPL_SLUG')}.{os.environ.get('REPL_OWNER')}.repl.co/linkedin/callback"
LINKEDIN_AUTHORIZATION_BASE_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_PROFILE_API_URL = "https://api.linkedin.com/v2/me"


@app.route('/linkedin/login')
def linkedin_login():
    max_retries = 3
    retry_delay = 5

    for attempt in range(max_retries):
        try:
            linkedin = OAuth2Session(LINKEDIN_CLIENT_ID,
                                     redirect_uri=LINKEDIN_REDIRECT_URI,
                                     scope=['r_liteprofile', 'r_emailaddress'])
            authorization_url, state = linkedin.authorization_url(
                LINKEDIN_AUTHORIZATION_BASE_URL)
            session['oauth_state'] = state
            return """
                <script>
                    window.open('{}', 'LinkedIn Login', 'width=600,height=700');
                    window.close();
                </script>
            """.format(authorization_url)
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            return "LinkedIn is temporarily unavailable. Please try again in a few minutes.", 503


@app.route('/linkedin/callback')
def linkedin_callback():
    try:
        linkedin = OAuth2Session(LINKEDIN_CLIENT_ID,
                                 state=session['oauth_state'])
        token = linkedin.fetch_token(LINKEDIN_TOKEN_URL,
                                     client_secret=LINKEDIN_CLIENT_SECRET,
                                     authorization_response=request.url)
        linkedin = OAuth2Session(LINKEDIN_CLIENT_ID, token=token)
        profile_data = linkedin.get(LINKEDIN_PROFILE_API_URL).json()

        # Store encrypted token in session
        session['linkedin_oauth_token'] = token
        session['linkedin_email'] = profile_data.get('emailAddress', '')
        session.permanent = True  # Make session persistent but with expiry

        return """
            <script>
                window.opener.postMessage({ 
                    type: 'LINKEDIN_AUTH_SUCCESS',
                    email: %s
                }, '*');
                window.close();
            </script>
        """ % json.dumps(profile_data.get('emailAddress', ''))
    except Exception as e:
        return """
            <script>
                window.opener.postMessage({ type: 'LINKEDIN_AUTH_ERROR', error: 'Authentication failed' }, '*');
                window.close();
            </script>
        """'''


if __name__ == '__main__':
    app.secret_key = "YOUR_SECRET_KEY"  # Set a secret key for sessions
    app.run(host='0.0.0.0', port=5000)
