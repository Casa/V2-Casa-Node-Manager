import crypt, sys

def generate_hashed_password(password):
    return crypt.crypt(password, crypt.mksalt(crypt.METHOD_SHA512))

f = open("/usr/local/casa/signals/account_signal", "w")
f.write(generate_hashed_password(sys.argv[1]))
f.close()
