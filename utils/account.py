import crypt, sys, json

def generate_hashed_password(password):
    return crypt.crypt(password, crypt.mksalt(crypt.METHOD_SHA512))

data = {'password': generate_hashed_password(sys.argv[2])}

account_signal_file = sys.argv[1]
with open(account_signal_file, 'w') as asf:
    json.dump(data, asf)
