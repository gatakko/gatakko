import PAM


def _pam_conv(_auth, query_list, user_data):
    result = []
    for query in query_list:
        if query[1] in (PAM.PAM_PROMPT_ECHO_ON, PAM.PAM_PROMPT_ECHO_OFF):
            result.append((user_data, 0))
        else:
            return None
    return result


def authenticate(user, password):
    try:
        auth = PAM.pam()
        auth.start('webui')
        auth.set_item(PAM.PAM_USER, user)
        auth.set_item(PAM.PAM_CONV, _pam_conv)
        auth.setUserData(password)
        auth.authenticate()
        auth.acct_mgmt()
        return True
    except PAM.error:
        return False
