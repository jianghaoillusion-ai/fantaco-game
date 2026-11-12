"""Current comparison entry point; cast6 uses visible silhouette measurements."""
import sys
sys.dont_write_bytecode = True
from measure_cast6 import make

if __name__ == "__main__":
    make()
