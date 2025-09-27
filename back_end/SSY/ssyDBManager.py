from oracledb import connect
from SSY import config

class SsyDBManager:
    @staticmethod
    def makeConCur():
        # user, password, dsn을 분리하여 인자로 전달
        con = connect(
            user=config.ORACLE_USER,
            password=config.ORACLE_PASSWORD,
            dsn=config.ORACLE_DSN
        )
        cur = con.cursor()
        return con, cur
    @staticmethod
    def closeConCur(con, cur):
        if cur:  # Check if cur is not None
            cur.close()
        if con:  # Check if con is not None
            con.close()
